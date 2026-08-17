import "server-only";
import { cookies } from "next/headers";

/**
 * Preferencia de idioma del cuidador — cookie simple, sin cuenta (mismo
 * espíritu que cuidador-session.ts). No es sensible, no va firmada.
 */

export type Idioma = "es" | "qu";

const COOKIE_IDIOMA = "hp_idioma";

export async function leerIdioma(): Promise<Idioma> {
  const store = await cookies();
  return store.get(COOKIE_IDIOMA)?.value === "qu" ? "qu" : "es";
}
