"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const COOKIE_IDIOMA = "hp_idioma";
const UN_ANIO = 60 * 60 * 24 * 365;

export async function cambiarIdioma(formData: FormData) {
  const idioma = formData.get("idioma") === "qu" ? "qu" : "es";
  const store = await cookies();
  store.set(COOKIE_IDIOMA, idioma, { path: "/", maxAge: UN_ANIO, sameSite: "lax" });
  // No hace falta saber la ruta actual: invalida todo el árbol del layout
  // del cuidador y Next vuelve a renderizar la misma página, sin navegar.
  revalidatePath("/cuidador", "layout");
}
