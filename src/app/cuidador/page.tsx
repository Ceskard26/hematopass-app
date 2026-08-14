import { redirect } from "next/navigation";
import { sesionCuidadorValida } from "@/lib/cuidador-guard";
import { ingresarComoCuidador } from "@/lib/actions-cuidador";
import { IngresoCuidadorForm } from "@/components/ingreso-cuidador-form";

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
      <IngresoCuidadorForm accion={ingresarComoCuidador} error={error} />
    </main>
  );
}
