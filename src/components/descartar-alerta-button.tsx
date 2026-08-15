"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { descartarAlerta } from "@/lib/actions-riesgo";

/**
 * "descartada" existe en el enum desde el diseño original (src/db/schema.ts)
 * pero no tenía botón — un falso positivo se quedaba en la bandeja para
 * siempre, o había que mentir marcándolo "resuelta". Pide confirmación
 * inline (no un `confirm()` nativo) porque es la única acción destructiva
 * de esta pantalla.
 */
export function DescartarAlertaButton({ alertaId }: { alertaId: string }) {
  const [confirmando, setConfirmando] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function confirmar() {
    startTransition(async () => {
      await descartarAlerta(alertaId);
      router.refresh();
    });
  }

  if (confirmando) {
    return (
      <span className="hp-in-fast text-sm text-text-muted">
        ¿Descartar esta alerta?{" "}
        <button
          type="button"
          disabled={pending}
          onClick={confirmar}
          className="hp-press font-medium text-status-vencido underline disabled:opacity-50"
        >
          Sí, descartar
        </button>{" "}
        ·{" "}
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          className="hp-press underline"
        >
          Cancelar
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirmando(true)}
      className="hp-press text-sm text-text-muted underline shrink-0"
    >
      Descartar
    </button>
  );
}
