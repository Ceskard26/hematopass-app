import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { paciente, pacienteCuidador, paso, resultadoLab } from "@/db/schema";

/**
 * Capa de lectura para la app del cuidador. Toda función que recibe un
 * `pacienteId` debe pasar primero por `pacienteEsDeCuidador` — la cookie de
 * sesión (src/lib/cuidador-session.ts) es solo un ID firmado contra
 * manipulación, NO una prueba de pertenencia. Sin esta verificación, un
 * cuidador podría escribir el UUID de otro paciente en la cookie y ver su
 * ruta.
 */

export async function pacienteEsDeCuidador(cuidadorId: string, pacienteId: string) {
  const [row] = await db
    .select({ id: pacienteCuidador.pacienteId })
    .from(pacienteCuidador)
    .where(
      and(
        eq(pacienteCuidador.cuidadorId, cuidadorId),
        eq(pacienteCuidador.pacienteId, pacienteId)
      )
    )
    .limit(1);
  return !!row;
}

export async function pacientesDeCuidador(cuidadorId: string) {
  const filas = await db
    .select({ paciente })
    .from(pacienteCuidador)
    .innerJoin(paciente, eq(pacienteCuidador.pacienteId, paciente.id))
    .where(eq(pacienteCuidador.cuidadorId, cuidadorId))
    .orderBy(asc(paciente.nombre));
  return filas.map((f) => f.paciente);
}

export async function buscarPacientePorCodigoYCuidador(codigo: string) {
  const p = await db.query.paciente.findFirst({
    where: (t, { eq }) => eq(t.codigo, codigo.trim().toUpperCase()),
    with: { cuidadores: true },
  });
  return p ?? null;
}

export async function obtenerRutaParaCuidador(pacienteId: string) {
  const p = await db.query.paciente.findFirst({
    where: (t, { eq }) => eq(t.id, pacienteId),
    with: {
      rutas: {
        where: (r, { eq }) => eq(r.estado, "activa"),
        orderBy: (r, { desc }) => [desc(r.creadaEn)],
        with: {
          pasos: {
            orderBy: (ps, { asc }) => [asc(ps.orden)],
            with: { ubicacion: true },
          },
        },
      },
    },
  });
  if (!p) return null;

  const rutaActiva = p.rutas[0] ?? null;
  const pasos = rutaActiva?.pasos ?? [];
  const pasoActual =
    pasos.find((x) => x.estado === "notificado" || x.estado === "en_curso") ??
    pasos.find((x) => x.estado === "vencido") ??
    pasos.find((x) => x.estado === "programado") ??
    null;

  return { paciente: p, rutaActiva, pasos, pasoActual };
}

/**
 * El semáforo "¿Debo viajar?" (F5 lo hará data-driven vía el motor de
 * riesgo; por ahora expone el dato crudo que R5 va a consumir: si hay un
 * resultado pendiente Y una cita próxima).
 */
export async function resultadosPendientesDePaciente(pacienteId: string) {
  return db
    .select()
    .from(resultadoLab)
    .where(and(eq(resultadoLab.pacienteId, pacienteId)));
}

export async function obtenerPasoPorUbicacionPendiente(
  pacienteId: string,
  ubicacionId: string
) {
  const rows = await db.query.ruta.findMany({
    where: (r, { eq, and: andR }) => andR(eq(r.pacienteId, pacienteId), eq(r.estado, "activa")),
    with: {
      pasos: {
        where: (ps, { eq, and: andP, inArray }) =>
          andP(
            eq(ps.ubicacionId, ubicacionId),
            inArray(ps.estado, ["programado", "notificado", "en_curso", "vencido"])
          ),
        orderBy: (ps, { asc }) => [asc(ps.orden)],
        limit: 1,
      },
    },
  });

  return rows.flatMap((r) => r.pasos)[0] ?? null;
}

const R5_HORAS = Number(process.env.RISK_R5_HORAS_VIAJE ?? 48);

type EstadoViaje = "verde" | "amarillo" | "rojo";

/**
 * El semáforo "¿Debo viajar?" que ve la familia. Misma señal que la regla
 * R5 del motor de riesgo (src/lib/risk-engine.ts), pero explicada para el
 * cuidador en vez de para el equipo clínico: no "regla disparada", sino
 * "espera antes de viajar" / "puedes viajar tranquilo".
 */
export async function evaluarViaje(pacienteId: string) {
  const detalle = await obtenerRutaParaCuidador(pacienteId);
  if (!detalle) return null;

  const resultados = await resultadosPendientesDePaciente(pacienteId);
  const resultadoPendiente = resultados.find((r) => r.estado === "pendiente") ?? null;

  const ahora = Date.now();
  const proximaConsulta = detalle.pasos.find((p) => {
    if (p.tipo !== "consulta" || !p.programadoPara) return false;
    return new Date(p.programadoPara).getTime() > ahora;
  });

  let estado: EstadoViaje = "verde";
  if (resultadoPendiente && proximaConsulta?.programadoPara) {
    const horasFaltan = (new Date(proximaConsulta.programadoPara).getTime() - ahora) / 3_600_000;
    estado = horasFaltan < R5_HORAS ? "rojo" : "amarillo";
  } else if (resultadoPendiente) {
    estado = "amarillo";
  }

  return {
    estado,
    esProvincia: detalle.paciente.esProvincia,
    departamento: detalle.paciente.departamento,
    resultadoPendiente,
    proximaConsulta: proximaConsulta ?? null,
  };
}

export { paso };
