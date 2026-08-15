"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actualizarNotaPaso } from "@/lib/actions";

/**
 * Nota libre del médico por paso — visible para el cuidador en su
 * pasaporte. Decisión de producto explícita (ver src/db/schema.ts,
 * paso.notaMedica): reemplaza la regla original de no mostrar diagnóstico
 * completo a la familia.
 */
export function NotaMedicaForm({
  pasoId,
  pacienteCodigo,
  notaActual,
}: {
  pasoId: string;
  pacienteCodigo: string;
  notaActual: string | null;
}) {
  const [editando, setEditando] = useState(false);
  const [nota, setNota] = useState(notaActual ?? "");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function guardar() {
    startTransition(async () => {
      await actualizarNotaPaso({ pasoId, pacienteCodigo, nota });
      setEditando(false);
      router.refresh();
    });
  }

  if (!editando) {
    return (
      <div className="mt-1.5">
        {notaActual ? (
          <p className="text-xs text-text-muted italic">
            “{notaActual}”{" "}
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="hp-press not-italic underline shrink-0"
            >
              Editar
            </button>
          </p>
        ) : (
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="hp-press text-xs text-primary underline"
          >
            + Agregar nota clínica
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="hp-in-fast mt-1.5 space-y-1.5">
      <textarea
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Indicación, conclusión de la consulta, diagnóstico…"
        aria-label="Nota clínica de este paso"
        rows={2}
        autoFocus
        className="w-full rounded-md border border-border bg-surface-1 px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={guardar}
          className="hp-press rounded-md bg-primary text-primary-ink px-2.5 py-1 text-xs font-medium hover:opacity-90 disabled:opacity-50"
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={() => {
            setNota(notaActual ?? "");
            setEditando(false);
          }}
          className="hp-press text-xs text-text-muted hover:text-text"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
