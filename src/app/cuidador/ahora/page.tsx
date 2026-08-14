import { redirect } from "next/navigation";
import Link from "next/link";
import { leerSesionCuidador } from "@/lib/cuidador-session";
import {
  obtenerRutaParaCuidador,
  pacientesDeCuidador,
  evaluarViaje,
} from "@/lib/queries-cuidador";
import { LiveRefresher } from "@/components/live-refresher";

const ICONO_TIPO: Record<string, string> = {
  consulta: "◔",
  laboratorio: "◑",
  imagen: "◐",
  farmacia: "◒",
  transfusion: "●",
  tramite_sis: "◓",
  referencia: "◕",
  control: "◔",
};

export default async function TarjetaAhoraPage() {
  const sesion = await leerSesionCuidador();
  if (!sesion) redirect("/cuidador");

  const [detalle, pacientes, viaje] = await Promise.all([
    obtenerRutaParaCuidador(sesion.pacienteId),
    pacientesDeCuidador(sesion.cuidadorId),
    evaluarViaje(sesion.pacienteId),
  ]);

  // Paciente inexistente (cookie firmada pero obsoleta, ej. tras un reseed):
  // redirige a "/cuidador", que usa sesionCuidadorValida (no solo la firma)
  // para decidir si reenvía aquí — por eso esto no hace un bucle infinito.
  if (!detalle) redirect("/cuidador");
  const { paciente: p, pasoActual } = detalle;

  // El aviso "¿Debo viajar?" solo aparece cuando hay algo que decidir —
  // familias de Lima o sin resultado pendiente nunca lo ven. Deliberadamente
  // no es un 4to ítem de navegación fija (docs/sistema-de-diseno.md §7:
  // máximo 3 destinos) — aparece solo cuando es relevante.
  const mostrarAvisoViaje = viaje && viaje.esProvincia && viaje.estado !== "verde";

  return (
    <main className="flex flex-col min-h-full px-6 pt-8">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm text-text-muted">Ruta de</p>
          <p className="text-md font-medium">{p.nombre.split(" ")[0]}</p>
        </div>
        {pacientes.length > 1 && (
          <Link href="/cuidador/elegir" className="text-sm text-primary underline">
            Cambiar de hijo(a)
          </Link>
        )}
      </div>
      <div className="mb-4">
        <LiveRefresher pacienteId={sesion.pacienteId} mostrarIndicador />
      </div>

      {mostrarAvisoViaje && (
        <Link
          href="/cuidador/viaje"
          className="mb-6 flex items-center gap-3 rounded-lg border px-4 py-3"
          style={{
            borderColor:
              viaje!.estado === "rojo" ? "var(--status-vencido)" : "var(--status-en-curso)",
            backgroundColor:
              viaje!.estado === "rojo" ? "color-mix(in srgb, var(--status-vencido) 8%, transparent)" : "color-mix(in srgb, var(--status-en-curso) 8%, transparent)",
          }}
        >
          <span
            className="text-lg shrink-0"
            style={{
              color: viaje!.estado === "rojo" ? "var(--status-vencido)" : "var(--status-en-curso)",
            }}
            aria-hidden="true"
          >
            {viaje!.estado === "rojo" ? "▲" : "●"}
          </span>
          <span className="text-sm font-medium">
            {viaje!.estado === "rojo" ? "Espera antes de viajar — toca aquí" : "Confirma antes de viajar — toca aquí"}
          </span>
        </Link>
      )}

      {!pasoActual ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <p className="text-5xl mb-4" aria-hidden="true">
            ⬡
          </p>
          <h1 className="font-serif text-xl mb-2">Todo al día</h1>
          <p className="text-base text-text-muted leading-relaxed max-w-xs">
            No tienes ningún paso pendiente ahora. Te avisaremos apenas el
            equipo médico agregue el siguiente.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center text-center">
          <p className="text-sm text-text-muted mb-1" aria-hidden="true">
            {ICONO_TIPO[pasoActual.tipo] ?? "●"}
          </p>
          <p className="text-sm text-text-muted uppercase tracking-wide mb-3">
            Tu próximo paso
          </p>

          <h1 className="font-serif text-xxl leading-[1.05] mb-6">
            {pasoActual.ubicacion?.nombre ?? "—"}
          </h1>

          <p className="text-md font-medium mb-1">
            {pasoActual.ubicacion?.piso}
            {pasoActual.ubicacion?.modulo ? ` · Módulo ${pasoActual.ubicacion.modulo}` : ""}
          </p>
          {pasoActual.ubicacion?.ventanilla && (
            <p className="text-lg font-semibold mb-8" style={{ color: "var(--surface-primary)" }}>
              {pasoActual.ubicacion.ventanilla}
            </p>
          )}

          <p className="text-base text-text-muted leading-relaxed max-w-xs mb-10">
            {pasoActual.instruccionCuidador}
          </p>

          <Link
            href="/cuidador/escanear"
            className="w-full max-w-xs min-h-12 flex items-center justify-center rounded-lg bg-primary text-primary-ink py-4 text-md font-semibold text-center transition-colors hover:opacity-90"
          >
            Escanear código
          </Link>
        </div>
      )}
    </main>
  );
}
