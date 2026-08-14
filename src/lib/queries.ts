import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { paso, ubicacion, evento, resultadoLab } from "@/db/schema";

/**
 * Capa de lectura para el dashboard clínico. Server-only: se llama
 * directamente desde Server Components, sin pasar por una API pública —
 * el personal ya está autenticado y autorizado por src/proxy.ts.
 */

export async function listarPacientesClinico() {
  const pacientes = await db.query.paciente.findMany({
    orderBy: (p, { asc }) => [asc(p.nombre)],
    with: {
      rutas: {
        where: (r, { eq }) => eq(r.estado, "activa"),
        with: {
          pasos: {
            orderBy: (p, { asc }) => [asc(p.orden)],
          },
        },
      },
    },
  });

  return pacientes.map((p) => {
    const rutaActiva = p.rutas[0];
    const pasos = rutaActiva?.pasos ?? [];
    const pasoActual =
      pasos.find((x) => x.estado === "notificado" || x.estado === "en_curso") ??
      pasos.find((x) => x.estado === "vencido") ??
      pasos.find((x) => x.estado === "programado");
    const pendientes = pasos.filter((x) =>
      ["programado", "notificado", "en_curso", "vencido"].includes(x.estado)
    ).length;
    const vencidos = pasos.filter((x) => x.estado === "vencido").length;

    return {
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      dxNombre: p.dxNombre,
      departamento: p.departamento,
      esProvincia: p.esProvincia,
      faseTratamiento: p.faseTratamiento,
      rutaId: rutaActiva?.id ?? null,
      pasoActualTipo: pasoActual?.tipo ?? null,
      pasoActualTitulo: pasoActual?.tituloClinico ?? null,
      pendientes,
      vencidos,
    };
  });
}

export async function obtenerPacienteDetalle(codigo: string) {
  const p = await db.query.paciente.findFirst({
    where: (t, { eq }) => eq(t.codigo, codigo),
    with: {
      cuidadores: { with: { cuidador: true } },
      rutas: {
        orderBy: (r, { desc }) => [desc(r.creadaEn)],
        with: {
          pasos: {
            orderBy: (ps, { asc }) => [asc(ps.orden)],
            with: { ubicacion: true },
          },
        },
      },
      resultados: {
        orderBy: (r, { desc }) => [desc(r.solicitadoEn)],
        limit: 5,
      },
    },
  });

  if (!p) return null;

  const rutaActiva = p.rutas.find((r) => r.estado === "activa") ?? p.rutas[0] ?? null;

  const eventos = rutaActiva
    ? await db
        .select()
        .from(evento)
        .where(
          or(
            and(eq(evento.entidadTipo, "paciente"), eq(evento.entidadId, p.id)),
            sql`${evento.entidadId} in (select id from paso where ruta_id = ${rutaActiva.id})`
          )
        )
        .orderBy(desc(evento.ocurridoEn))
        .limit(20)
    : [];

  return { paciente: p, rutaActiva, eventos };
}

export async function listarUbicaciones() {
  return db.select().from(ubicacion).orderBy(ubicacion.nombre);
}

export async function siguienteOrden(rutaId: string) {
  const [row] = await db
    .select({ max: sql<number>`coalesce(max(${paso.orden}), 0)` })
    .from(paso)
    .where(eq(paso.rutaId, rutaId));
  return (row?.max ?? 0) + 1;
}

export async function resultadosPendientes(pacienteId: string) {
  return db
    .select()
    .from(resultadoLab)
    .where(and(eq(resultadoLab.pacienteId, pacienteId), isNull(resultadoLab.listoEn)))
    .orderBy(desc(resultadoLab.solicitadoEn));
}
