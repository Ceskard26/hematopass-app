import { redirect } from "next/navigation";
import { sesionCuidadorValida } from "@/lib/cuidador-guard";
import { ingresarComoCuidador } from "@/lib/actions-cuidador";

const ERRORES: Record<string, string> = {
  vacio: "Escribe el código de tu pasaporte.",
  no_encontrado: "No encontramos ese código. Revisa tu tarjeta e intenta de nuevo.",
};

export default async function CuidadorEntradaPage(props: PageProps<"/cuidador">) {
  // sesionCuidadorValida (no leerSesionCuidador) porque además de la firma
  // verifica que el paciente siga existiendo. Si no, se muestra el
  // formulario de entrada en vez de redirigir a "/ahora" — eso es lo que
  // evita el bucle infinito con una cookie firmada pero obsoleta.
  const sesion = await sesionCuidadorValida();
  if (sesion) redirect("/cuidador/ahora");

  const searchParams = await props.searchParams;
  const errorKey = typeof searchParams.error === "string" ? searchParams.error : null;
  const error = errorKey ? ERRORES[errorKey] : null;

  return (
    <main className="flex-1 flex items-center justify-center px-6 min-h-full">
      <form action={ingresarComoCuidador} className="w-full max-w-sm text-center">
        <p className="text-5xl mb-4" aria-hidden="true">
          ⬡
        </p>
        <h1 className="font-serif text-xl mb-2">Bienvenido a Hematopass</h1>
        <p className="text-base text-text-muted leading-relaxed mb-8">
          Escribe el código de tu pasaporte. Está impreso en la tarjeta que te
          dieron en Admisión.
        </p>

        {error && (
          <p className="mb-4 rounded-md bg-status-vencido/10 border border-status-vencido/30 text-status-vencido text-sm px-3 py-2">
            {error}
          </p>
        )}

        <input
          name="codigo"
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          placeholder="HP-00001"
          required
          className="w-full text-center text-lg tracking-wide rounded-md border border-border bg-surface-1 px-4 py-3 mb-4 outline-none focus:ring-2 focus:ring-primary"
        />

        <button
          type="submit"
          className="w-full rounded-md bg-primary text-primary-ink py-3 text-base font-semibold transition-colors hover:opacity-90"
        >
          Ingresar
        </button>
      </form>
    </main>
  );
}
