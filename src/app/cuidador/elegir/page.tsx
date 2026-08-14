import { redirect } from "next/navigation";
import { leerSesionCuidador } from "@/lib/cuidador-session";
import { pacientesDeCuidador } from "@/lib/queries-cuidador";
import { cambiarPacienteActivo } from "@/lib/actions-cuidador";

/**
 * "Un teléfono, varios hijos": muchos hogares comparten un solo celular
 * entre hermanos (docs/arquitectura.md §7). Este selector existe para eso.
 */
export default async function ElegirPacientePage() {
  const sesion = await leerSesionCuidador();
  if (!sesion) redirect("/cuidador");

  const pacientes = await pacientesDeCuidador(sesion.cuidadorId);

  return (
    <main className="flex-1 flex flex-col px-6 pt-8 min-h-full">
      <h1 className="font-serif text-lg mb-6">¿De quién es la ruta?</h1>
      <div className="space-y-3">
        {pacientes.map((p) => (
          <form key={p.id} action={cambiarPacienteActivo.bind(null, p.id)}>
            <button
              type="submit"
              className="w-full text-left rounded-lg border border-border bg-surface-1 px-4 py-4 hover:border-primary transition-colors"
            >
              <span className="block text-md font-medium">{p.nombre}</span>
              <span className="block text-sm text-text-muted">{p.dxNombre}</span>
            </button>
          </form>
        ))}
      </div>
    </main>
  );
}
