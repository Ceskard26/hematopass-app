import { db } from "@/db";

const ORDEN_SEVERIDAD: Record<string, number> = { critica: 0, alta: 1, media: 2 };

/**
 * "Abiertas" = activa O en_seguimiento. Registrar un contacto sin marcar
 * resuelto mueve la alerta a en_seguimiento — sigue siendo trabajo
 * pendiente y debe seguir apareciendo en la bandeja. Solo "resuelta" y
 * "descartada" salen de esta lista.
 */
export async function listarAlertasActivas() {
  const filas = await db.query.alerta.findMany({
    where: (a, { inArray }) => inArray(a.estado, ["activa", "en_seguimiento"]),
    with: {
      paciente: true,
      contactos: {
        orderBy: (c, { desc }) => [desc(c.ocurridoEn)],
        limit: 3,
        with: { usuario: true },
      },
    },
  });

  return filas.sort((a, b) => {
    const porSeveridad = ORDEN_SEVERIDAD[a.severidad] - ORDEN_SEVERIDAD[b.severidad];
    if (porSeveridad !== 0) return porSeveridad;
    return new Date(a.creadaEn).getTime() - new Date(b.creadaEn).getTime();
  });
}
