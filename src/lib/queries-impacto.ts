import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { paciente, ruta, paso, alerta, contacto } from "@/db/schema";

/**
 * Métricas derivadas de la bitácora de eventos y del estado actual —
 * exactamente la promesa de docs/modelo-de-datos.md: `evento` da estas
 * cifras sin instrumentación adicional. Sin librería de gráficos: el
 * panel usa SVG propio (ver /impacto/page.tsx).
 */
export async function obtenerMetricasImpacto() {
  const [{ n: totalConRuta }] = await db
    .select({ n: sql<number>`count(distinct ${ruta.pacienteId})::int` })
    .from(ruta);

  const [{ n: enAbandono }] = await db
    .select({ n: sql<number>`count(distinct ${alerta.pacienteId})::int` })
    .from(alerta)
    .where(
      and(eq(alerta.regla, "R1_abandono"), inArray(alerta.estado, ["activa", "en_seguimiento"]))
    );

  const [estadosPaso] = await db
    .select({
      completados: sql<number>`count(*) filter (where ${paso.estado} = 'completado')::int`,
      pendientes: sql<number>`count(*) filter (where ${paso.estado} in ('programado','notificado','en_curso'))::int`,
      vencidos: sql<number>`count(*) filter (where ${paso.estado} = 'vencido')::int`,
      noAsistio: sql<number>`count(*) filter (where ${paso.estado} = 'no_asistio')::int`,
    })
    .from(paso);

  const [{ n: viajesEvitados }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(alerta)
    .where(and(eq(alerta.regla, "R5_viaje_en_riesgo"), eq(alerta.estado, "resuelta")));

  const [{ n: viajesEnRiesgoAhora }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(alerta)
    .where(
      and(
        eq(alerta.regla, "R5_viaje_en_riesgo"),
        inArray(alerta.estado, ["activa", "en_seguimiento"])
      )
    );

  const [{ n: totalContactos }] = await db.select({ n: sql<number>`count(*)::int` }).from(contacto);
  const [{ n: contactosExitosos }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(contacto)
    .where(eq(contacto.resultado, "contactado"));

  const [{ provincia, total: totalPacientes }] = await db
    .select({
      provincia: sql<number>`count(*) filter (where ${paciente.esProvincia})::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(paciente);

  // Tiempo promedio entre pasos completados: calculado en JS a partir de
  // los timestamps, no en SQL con funciones de ventana — más simple de
  // verificar y suficiente para el volumen de datos de la demo.
  const completados = await db
    .select({ rutaId: paso.rutaId, orden: paso.orden, completadoEn: paso.completadoEn })
    .from(paso)
    .where(eq(paso.estado, "completado"));

  const porRuta = new Map<string, { orden: number; completadoEn: Date }[]>();
  for (const p of completados) {
    if (!p.completadoEn) continue;
    const lista = porRuta.get(p.rutaId) ?? [];
    lista.push({ orden: p.orden, completadoEn: new Date(p.completadoEn) });
    porRuta.set(p.rutaId, lista);
  }

  const brechas: number[] = [];
  for (const lista of porRuta.values()) {
    lista.sort((a, b) => a.orden - b.orden);
    for (let i = 1; i < lista.length; i++) {
      const horas = (lista[i].completadoEn.getTime() - lista[i - 1].completadoEn.getTime()) / 3_600_000;
      if (horas > 0) brechas.push(horas);
    }
  }
  const diasPromedioEntrePasos = brechas.length
    ? brechas.reduce((a, b) => a + b, 0) / brechas.length / 24
    : null;

  const totalPasos = estadosPaso.completados + estadosPaso.pendientes + estadosPaso.vencidos + estadosPaso.noAsistio;

  return {
    totalPacientes,
    totalConRuta,
    enAbandono,
    tasaAbandono: totalConRuta ? (enAbandono / totalConRuta) * 100 : 0,
    porcentajeProvincia: totalPacientes ? (provincia / totalPacientes) * 100 : 0,
    pasos: { ...estadosPaso, total: totalPasos },
    viajesEvitados,
    viajesEnRiesgoAhora,
    contactos: { total: totalContactos, exitosos: contactosExitosos },
    diasPromedioEntrePasos,
  };
}
