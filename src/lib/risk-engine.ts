import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { alerta, evento } from "@/db/schema";

/**
 * Motor de riesgo: 5 reglas explícitas, no machine learning. Cada una
 * produce un motivo en español, redactado como se lo dirías a un colega.
 * Umbrales configurables por variable de entorno — nunca incrustados en el
 * código (ver docs/motor-de-riesgo.md, .env.example).
 *
 * R5 es la única regla PREVENTIVA: no persigue al paciente que ya
 * abandonó, previene el viaje interprovincial desperdiciado que con más
 * frecuencia que cualquier otra causa produce el abandono (Bloque 1 de
 * investigación: ~54% de pacientes hospitalizados del INSNSB vienen de
 * provincia; ~41% del abandono en la región es económico/transporte).
 */

const R1_DIAS = Number(process.env.RISK_R1_DIAS_SIN_ACTIVIDAD ?? 28);
const R2_HORAS = Number(process.env.RISK_R2_HORAS_VENCIDO ?? 48);
const R4_HORAS = Number(process.env.RISK_R4_HORAS_RESULTADO_HUERFANO ?? 72);
const R5_HORAS = Number(process.env.RISK_R5_HORAS_VIAJE ?? 48);

type Regla =
  | "R1_abandono"
  | "R2_paso_vencido"
  | "R3_inasistencias"
  | "R4_resultado_huerfano"
  | "R5_viaje_en_riesgo";

type Hallazgo = {
  pacienteId: string;
  regla: Regla;
  severidad: "media" | "alta" | "critica";
  motivoTexto: string;
};

function horasEntre(desde: Date | string, hasta: number) {
  return (hasta - new Date(desde).getTime()) / 3_600_000;
}

/**
 * Evalúa las 5 reglas contra el estado actual de la base. Puro respecto a
 * la base de datos: lee, no escribe. `sincronizarAlertas` (abajo) es quien
 * persiste el resultado.
 */
export async function evaluarRiesgo(): Promise<Hallazgo[]> {
  const pacientes = await db.query.paciente.findMany({
    with: {
      rutas: {
        where: (r, { eq: eqR }) => eqR(r.estado, "activa"),
        with: { pasos: { orderBy: (p, { asc }) => [asc(p.orden)] } },
      },
      resultados: true,
    },
  });

  const hallazgos: Hallazgo[] = [];
  const ahora = Date.now();

  for (const p of pacientes) {
    const rutaActiva = p.rutas[0];
    if (!rutaActiva) continue;
    const pasos = rutaActiva.pasos;

    // R1 · Abandono — sin actividad en ≥ R1_DIAS días (definición SIOP-PODC).
    // Referencia: el último paso completado, o si nunca completó ninguno,
    // el inicio de la ruta.
    const ultimoCompletado = [...pasos]
      .reverse()
      .find((x) => x.estado === "completado" && x.completadoEn);
    const referenciaInicio = ultimoCompletado?.completadoEn ?? rutaActiva.creadaEn;
    const diasSinActividad = horasEntre(referenciaInicio!, ahora) / 24;
    if (diasSinActividad >= R1_DIAS) {
      hallazgos.push({
        pacienteId: p.id,
        regla: "R1_abandono",
        severidad: "critica",
        motivoTexto: `${Math.floor(diasSinActividad)} días sin actividad. Cumple la definición internacional de abandono (SIOP-PODC: ≥4 semanas).`,
      });
    }

    // R2 · Paso vencido hace más de R2_HORAS horas.
    const pasoVencido = pasos.find(
      (x) =>
        (x.estado === "programado" || x.estado === "notificado" || x.estado === "vencido") &&
        x.venceEn &&
        horasEntre(x.venceEn, ahora) > R2_HORAS
    );
    if (pasoVencido) {
      const dias = Math.floor(horasEntre(pasoVencido.venceEn!, ahora) / 24);
      hallazgos.push({
        pacienteId: p.id,
        regla: "R2_paso_vencido",
        severidad: "alta",
        motivoTexto: `Paso "${pasoVencido.tituloClinico}" vencido hace ${dias} día${dias === 1 ? "" : "s"}.`,
      });
    }

    // R3 · 2 inasistencias consecutivas (los últimos 2 pasos por orden).
    const ultimosDos = pasos.slice(-2);
    if (ultimosDos.length === 2 && ultimosDos.every((x) => x.estado === "no_asistio")) {
      hallazgos.push({
        pacienteId: p.id,
        regla: "R3_inasistencias",
        severidad: "alta",
        motivoTexto: "2 citas consecutivas sin asistir.",
      });
    }

    // R4 · Resultado listo hace > R4_HORAS sin consulta de control posterior.
    // Se agregan TODOS los huérfanos en un solo hallazgo por paciente: un
    // Map keyed por pacienteId+regla solo puede quedarse con uno (ver
    // sincronizarAlertas), así que empujar un hallazgo por resultado
    // descartaba en silencio a todos menos el último.
    const huerfanos = p.resultados.filter((r) => {
      if (r.estado !== "listo" || !r.listoEn) return false;
      if (horasEntre(r.listoEn, ahora) <= R4_HORAS) return false;
      return !pasos.some(
        (x) =>
          x.tipo === "consulta" &&
          x.programadoPara &&
          new Date(x.programadoPara).getTime() > new Date(r.listoEn!).getTime()
      );
    });
    if (huerfanos.length === 1) {
      const r = huerfanos[0];
      const dias = Math.floor(horasEntre(r.listoEn!, ahora) / 24);
      hallazgos.push({
        pacienteId: p.id,
        regla: "R4_resultado_huerfano",
        severidad: "media",
        motivoTexto: `${r.tipo} listo hace ${dias} día(s), sin cita de control agendada.`,
      });
    } else if (huerfanos.length > 1) {
      const tipos = huerfanos.map((r) => r.tipo).join(", ");
      hallazgos.push({
        pacienteId: p.id,
        regla: "R4_resultado_huerfano",
        severidad: "media",
        motivoTexto: `${huerfanos.length} resultados listos sin cita de control agendada: ${tipos}.`,
      });
    }

    // R5 · Viaje en riesgo — la única regla preventiva. Provincia + consulta
    // en < R5_HORAS + resultado pendiente.
    if (p.esProvincia) {
      const consultaProxima = pasos.find((x) => {
        if (x.tipo !== "consulta" || !x.programadoPara) return false;
        const horasFaltan = (new Date(x.programadoPara).getTime() - ahora) / 3_600_000;
        return horasFaltan > 0 && horasFaltan < R5_HORAS;
      });
      const resultadoPendiente = p.resultados.some((r) => r.estado === "pendiente");
      if (consultaProxima && resultadoPendiente) {
        const horasFaltan = Math.floor(
          (new Date(consultaProxima.programadoPara!).getTime() - ahora) / 3_600_000
        );
        hallazgos.push({
          pacienteId: p.id,
          regla: "R5_viaje_en_riesgo",
          severidad: "alta",
          motivoTexto: `Familia de ${p.departamento} viaja en ${horasFaltan}h, pero el resultado aún no está listo. Confirmar o reprogramar antes del viaje.`,
        });
      }
    }
  }

  return hallazgos;
}

/**
 * Persiste el resultado de evaluarRiesgo() en la tabla `alerta`: crea las
 * nuevas, actualiza el motivo de las que ya existían (el texto cambia con
 * el tiempo, ej. "3 días" → "4 días"), y resuelve automáticamente las que
 * ya no aplican. Cada transición queda en `evento` — la bitácora es la
 * fuente de verdad también para las alertas.
 */
export async function sincronizarAlertas() {
  const hallazgos = await evaluarRiesgo();
  // "activa" y "en_seguimiento" cuentan como abiertas: si no se incluyera
  // en_seguimiento aquí, cada alerta con un contacto registrado (pero sin
  // resolver) se volvería a crear duplicada en la siguiente sincronización.
  const activas = await db
    .select()
    .from(alerta)
    .where(inArray(alerta.estado, ["activa", "en_seguimiento"]));

  const clave = (pacienteId: string, regla: string) => `${pacienteId}:${regla}`;
  const hallazgoPorClave = new Map(hallazgos.map((h) => [clave(h.pacienteId, h.regla), h]));
  const activaPorClave = new Map(activas.map((a) => [clave(a.pacienteId, a.regla), a]));

  for (const [key, h] of hallazgoPorClave) {
    const existente = activaPorClave.get(key);
    if (!existente) {
      const [nueva] = await db
        .insert(alerta)
        .values({
          pacienteId: h.pacienteId,
          regla: h.regla,
          severidad: h.severidad,
          motivoTexto: h.motivoTexto,
        })
        .returning();
      await db.insert(evento).values({
        entidadTipo: "alerta",
        entidadId: nueva.id,
        tipo: "alerta_creada",
        actorRol: "sistema",
        origen: "sistema",
        payload: { regla: h.regla },
      });
    } else if (existente.motivoTexto !== h.motivoTexto) {
      await db.update(alerta).set({ motivoTexto: h.motivoTexto }).where(eq(alerta.id, existente.id));
    }
  }

  for (const [key, a] of activaPorClave) {
    if (!hallazgoPorClave.has(key)) {
      await db
        .update(alerta)
        .set({ estado: "resuelta", resueltaEn: new Date() })
        .where(eq(alerta.id, a.id));
      await db.insert(evento).values({
        entidadTipo: "alerta",
        entidadId: a.id,
        tipo: "alerta_resuelta",
        actorRol: "sistema",
        origen: "sistema",
      });
    }
  }
}

export type { Hallazgo, Regla };
