import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cuidador, paciente, pacienteCuidador, paso, resultadoLab } from "@/db/schema";

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

/**
 * Nombre/relación del cuidador que tiene la sesión — la cookie solo guarda
 * el id (src/lib/cuidador-session.ts), el saludo "Hola, {nombre}" necesita
 * el dato real.
 */
export async function obtenerCuidador(cuidadorId: string) {
  const [row] = await db.select().from(cuidador).where(eq(cuidador.id, cuidadorId)).limit(1);
  return row ?? null;
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
    with: { cuidadores: { with: { cuidador: true } } },
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
 * Todos los resultados de laboratorio del paciente, cualquier estado (pese
 * al nombre de la versión anterior de esta función, no filtraba solo
 * pendientes — se usa tanto para el semáforo "¿Debo viajar?" como para la
 * sección "Resultados" de "Mi pasaporte", que sí necesita ver los listos).
 * Nunca expone el valor clínico del resultado, solo tipo y estado —
 * docs/sistema-de-diseno.md §6.2: la app del cuidador no muestra pronóstico
 * ni diagnóstico completo, y el esquema (src/db/schema.ts) ni siquiera
 * guarda el valor del resultado, solo su estado y fechas.
 */
export async function resultadosDePaciente(pacienteId: string) {
  return db
    .select()
    .from(resultadoLab)
    .where(eq(resultadoLab.pacienteId, pacienteId))
    .orderBy(desc(resultadoLab.solicitadoEn));
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

  const resultados = await resultadosDePaciente(pacienteId);
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
