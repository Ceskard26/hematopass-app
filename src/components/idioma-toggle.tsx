import { cambiarIdioma } from "@/lib/actions-idioma";
import type { Idioma } from "@/lib/idioma-cuidador";

/**
 * Selector español/quechua — dos formularios de un botón cada uno, sin
 * JS de cliente (server actions puras). Vive en el layout del cuidador,
 * así que aparece también en el login: quien habla quechua debe poder
 * elegirlo ANTES de tener que leer el resto en español.
 */
export function IdiomaToggle({ idioma }: { idioma: Idioma }) {
  const base = "px-2.5 py-1 text-xs font-bold";
  return (
    <div className="hp-press inline-flex items-center rounded-full border border-border overflow-hidden shrink-0">
      <form action={cambiarIdioma}>
        <input type="hidden" name="idioma" value="es" />
        <button
          type="submit"
          className={base}
          style={
            idioma === "es"
              ? { backgroundColor: "var(--surface-primary)", color: "var(--surface-primary-ink)" }
              : { color: "var(--surface-text-muted)" }
          }
        >
          ES
        </button>
      </form>
      <form action={cambiarIdioma}>
        <input type="hidden" name="idioma" value="qu" />
        <button
          type="submit"
          className={base}
          style={
            idioma === "qu"
              ? { backgroundColor: "var(--surface-primary)", color: "var(--surface-primary-ink)" }
              : { color: "var(--surface-text-muted)" }
          }
        >
          QU
        </button>
      </form>
    </div>
  );
}
