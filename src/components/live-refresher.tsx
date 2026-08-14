"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Beat 2 de la demo: "el celular se ilumina al instante, sin recargar".
 * No pinta nada por sí mismo — se suscribe al SSE de este paciente y le
 * pide al router de Next que vuelva a pedir los datos del Server Component
 * (router.refresh()), que es un refresco suave: sin parpadeo de página
 * completa, sin perder la posición de scroll.
 *
 * Reconexión: EventSource reintenta solo tras un error o corte, es
 * comportamiento nativo del navegador — cubre el riesgo de "SSE se corta
 * detrás de un proxy" (docs/plan-desarrollo.md §8) sin código adicional.
 */
export function LiveRefresher({
  pacienteId,
  mostrarIndicador = false,
}: {
  pacienteId: string;
  mostrarIndicador?: boolean;
}) {
  const router = useRouter();
  const [conectado, setConectado] = useState(false);

  useEffect(() => {
    const es = new EventSource(`/api/eventos?pacienteId=${pacienteId}`);

    es.addEventListener("conectado", () => setConectado(true));
    es.addEventListener("actualizacion", () => router.refresh());
    es.onerror = () => setConectado(false);

    return () => es.close();
  }, [pacienteId, router]);

  if (!mostrarIndicador) return null;

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-text-muted" aria-live="polite">
      <span
        className="h-1.5 w-1.5 rounded-full transition-colors"
        style={{
          backgroundColor: conectado ? "var(--status-completado)" : "var(--status-programado)",
        }}
        aria-hidden="true"
      />
      {conectado ? "En vivo" : "Conectando…"}
    </span>
  );
}
