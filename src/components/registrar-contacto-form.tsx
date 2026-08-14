"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registrarContacto } from "@/lib/actions-riesgo";

const CANALES = [
  { value: "llamada", label: "Llamada" },
  { value: "sms", label: "SMS" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "presencial", label: "Presencial" },
];

const RESULTADOS = [
  { value: "contactado", label: "Se logró contactar" },
  { value: "no_respondio", label: "No respondió" },
  { value: "numero_invalido", label: "Número inválido" },
];

export function RegistrarContactoForm({ alertaId }: { alertaId: string }) {
  const [abierto, setAbierto] = useState(false);
  const [canal, setCanal] = useState("llamada");
  const [resultado, setResultado] = useState("contactado");
  const [nota, setNota] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function enviar(marcarResuelta: boolean) {
    startTransition(async () => {
      await registrarContacto({ alertaId, canal, resultado, nota, marcarResuelta });
      setAbierto(false);
      setNota("");
      router.refresh();
    });
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="text-sm text-primary underline shrink-0"
      >
        Registrar contacto
      </button>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-2">
      <div className="flex gap-2">
        <select
          value={canal}
          onChange={(e) => setCanal(e.target.value)}
          className="rounded-md border border-border bg-surface-1 px-2 py-1.5 text-sm"
        >
          {CANALES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          value={resultado}
          onChange={(e) => setResultado(e.target.value)}
          className="rounded-md border border-border bg-surface-1 px-2 py-1.5 text-sm"
        >
          {RESULTADOS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      <textarea
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Nota (opcional)"
        rows={2}
        className="w-full rounded-md border border-border bg-surface-1 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => enviar(false)}
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface-2 disabled:opacity-50"
        >
          Guardar
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => enviar(true)}
          className="rounded-md bg-primary text-primary-ink px-3 py-1.5 text-sm hover:opacity-90 disabled:opacity-50"
        >
          Guardar y resolver
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="text-sm text-text-muted hover:text-text"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
