"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearPaso } from "@/lib/actions";
import { PLANTILLAS_PASO } from "@/lib/plantillas-paso";

type Ubicacion = {
  id: string;
  nombre: string;
  tipo: string;
  piso: string;
  modulo: string | null;
  ventanilla: string | null;
};

const TIPOS = Object.keys(PLANTILLAS_PASO) as (keyof typeof PLANTILLAS_PASO)[];

/**
 * "El doctor selecciona en un menú desplegable el siguiente paso" — la
 * lluvia de ideas original. Aquí son botones, no un desplegable: un clic
 * elige el tipo Y lo envía. Abrir la ficha del paciente (1) + este clic (2)
 * = los "2 clics" que documenta docs/plan-desarrollo.md §6.4.
 */
export function GenerarPasoPanel({
  pacienteCodigo,
  rutaId,
  ubicaciones,
}: {
  pacienteCodigo: string;
  rutaId: string | null;
  ubicaciones: Ubicacion[];
}) {
  const [pending, startTransition] = useTransition();
  const [enviando, setEnviando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [avanzado, setAvanzado] = useState(false);
  const router = useRouter();

  if (!rutaId) {
    return (
      <p className="text-sm text-text-muted italic">
        Este paciente no tiene una ruta activa.
      </p>
    );
  }

  function ubicacionPara(tipo: keyof typeof PLANTILLAS_PASO) {
    const objetivo = PLANTILLAS_PASO[tipo].ubicacionTipo;
    return ubicaciones.find((u) => u.tipo === objetivo) ?? ubicaciones[0];
  }

  function generar(tipo: keyof typeof PLANTILLAS_PASO) {
    const ubi = ubicacionPara(tipo);
    if (!ubi) {
      setError("No hay ubicaciones configuradas.");
      return;
    }
    setError(null);
    setEnviando(tipo);
    startTransition(async () => {
      try {
        await crearPaso({
          pacienteCodigo,
          // No-null: el componente retorna antes si rutaId es null (arriba).
          // TS no propaga esa guarda al closure de este callback.
          rutaId: rutaId!,
          tipo,
          ubicacionId: ubi.id,
        });
        router.refresh();
      } catch {
        setError("No se pudo generar el paso. Intenta de nuevo.");
      } finally {
        setEnviando(null);
      }
    });
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {TIPOS.map((tipo, i) => {
          const plantilla = PLANTILLAS_PASO[tipo];
          const ubi = ubicacionPara(tipo);
          const activo = enviando === tipo && pending;
          return (
            <button
              key={tipo}
              type="button"
              disabled={pending}
              onClick={() => generar(tipo)}
              className="hp-press hp-in text-left rounded-md border border-border bg-surface-1 px-3 py-2.5 hover:border-primary hover:bg-surface-2 disabled:opacity-50"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <span className="block text-sm font-medium">{plantilla.etiqueta}</span>
              <span className={`block text-xs text-text-muted ${activo ? "hp-pulse" : ""}`}>
                {activo ? "Generando…" : ubi ? `${ubi.nombre}${ubi.ventanilla ? ` · ${ubi.ventanilla}` : ""}` : "—"}
              </span>
            </button>
          );
        })}
      </div>

      {error && <p className="hp-in-fast mt-3 text-xs text-status-vencido">{error}</p>}

      <button
        type="button"
        onClick={() => setAvanzado((v) => !v)}
        className="hp-press mt-4 text-xs text-text-muted hover:text-text underline"
      >
        {avanzado ? "Ocultar personalización" : "Personalizar destino"}
      </button>

      {avanzado && (
        <p className="hp-in-fast mt-2 text-xs text-text-muted">
          Cada plantilla ya elige automáticamente la ubicación correcta según
          su tipo. Para forzar otra ventanilla específica, contacta a
          Sistemas — esta personalización fina queda fuera del alcance del
          prototipo.
        </p>
      )}
    </div>
  );
}
