"use client";

import { Mascota } from "@/components/mascota";
import { t } from "@/lib/i18n-cuidador";
import type { Idioma } from "@/lib/idioma-cuidador";

/**
 * Solo código + DNI en el login inicial — sin escaneo de QR aquí. El
 * escaneo vive en otras vistas (después de haber entrado), no como atajo
 * de esta pantalla (corrección directa del usuario).
 */
export function IngresoCuidadorForm({
  accion,
  error,
  idioma,
}: {
  accion: (formData: FormData) => void;
  error: string | null;
  idioma: Idioma;
}) {
  return (
    <form action={accion} className="hp-in w-full max-w-sm text-center">
      <Mascota estado="feliz" size={176} className="hp-in-pop mx-auto mb-2" />
      <h1 className="font-serif text-xl mb-2">{t(idioma, "bienvenida_titulo")}</h1>
      <p className="text-base text-text-muted leading-relaxed mb-8">
        {t(idioma, "bienvenida_texto")}
      </p>

      {error && (
        <p className="hp-in-fast mb-4 rounded-md bg-status-vencido/10 border border-status-vencido/30 text-status-vencido text-sm px-3 py-2">
          {error}
        </p>
      )}

      <label htmlFor="dni-cuidador" className="block text-left text-sm font-medium mb-1.5">
        {t(idioma, "dni_label")}
      </label>
      <input
        id="dni-cuidador"
        name="dni"
        type="text"
        inputMode="numeric"
        maxLength={8}
        placeholder="12345678"
        required
        className="w-full text-center text-lg tracking-wide rounded-md border border-border bg-surface-1 px-4 py-3 mb-6 outline-none transition-shadow focus:ring-2 focus:ring-primary"
      />

      <label htmlFor="codigo-cuidador" className="block text-left text-sm font-medium mb-1.5">
        {t(idioma, "codigo_label")}
      </label>
      <input
        id="codigo-cuidador"
        name="codigo"
        type="text"
        inputMode="text"
        autoCapitalize="characters"
        placeholder="HP-00001"
        required
        className="w-full text-center text-lg tracking-wide rounded-md border border-border bg-surface-1 px-4 py-3 mb-6 outline-none transition-shadow focus:ring-2 focus:ring-primary"
      />

      <button
        type="submit"
        className="hp-press w-full rounded-md bg-primary text-primary-ink py-3 text-base font-semibold hover:opacity-90"
      >
        {t(idioma, "ingresar")}
      </button>
    </form>
  );
}
