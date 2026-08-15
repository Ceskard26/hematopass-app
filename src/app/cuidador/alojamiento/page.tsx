import { redirect } from "next/navigation";
import { leerSesionCuidador } from "@/lib/cuidador-session";
import { obtenerRutaParaCuidador } from "@/lib/queries-cuidador";
import { Mascota } from "@/components/mascota";

/**
 * Placeholder de fase 2 del brief — "próximamente", gateado por
 * paciente.esProvincia (ya existe, no se duplica). Cero escritura.
 */
export default async function AlojamientoPage() {
  const sesion = await leerSesionCuidador();
  if (!sesion) redirect("/cuidador");

  const detalle = await obtenerRutaParaCuidador(sesion.pacienteId);
  if (!detalle) redirect("/cuidador");

  if (!detalle.paciente.esProvincia) redirect("/cuidador/ahora");

  return (
    <main className="px-6 pt-8 min-h-full flex flex-col items-center text-center">
      <Mascota estado="feliz" size={96} className="hp-in-pop mb-4" />
      <h1 className="font-serif text-lg mb-2">Alojamiento para familias de fuera de Lima</h1>
      <p className="text-base text-text-muted leading-relaxed max-w-xs">
        Estamos armando opciones de hospedaje con tarifa especial para familias
        que viajan desde otras provincias. Muy pronto vas a poder verlas aquí.
      </p>
    </main>
  );
}
