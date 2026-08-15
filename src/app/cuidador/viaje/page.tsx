import { redirect } from "next/navigation";
import Link from "next/link";
import { leerSesionCuidador } from "@/lib/cuidador-session";
import { evaluarViaje } from "@/lib/queries-cuidador";

const CONFIG_ESTADO = {
  verde: {
    titulo: "Puedes viajar tranquilo",
    color: "var(--status-completado)",
    simbolo: "✓",
    detalle: "No tienes resultados pendientes que puedan atrasar tu próxima cita.",
  },
  amarillo: {
    titulo: "Confirma antes de viajar",
    color: "var(--status-en-curso)",
    simbolo: "●",
    detalle:
      "Todavía hay un resultado pendiente, pero hay tiempo. Llama al hospital un día antes para confirmar.",
  },
  rojo: {
    titulo: "Espera antes de viajar",
    color: "var(--status-vencido)",
    simbolo: "▲",
    detalle:
      "Tu resultado aún no está listo y tu cita es pronto. Llama al hospital antes de viajar — puede que convenga reprogramar.",
  },
} as const;

function formatearFecha(fecha: Date | string) {
  return new Date(fecha).toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function DeboViajarPage() {
  const sesion = await leerSesionCuidador();
  if (!sesion) redirect("/cuidador");

  const viaje = await evaluarViaje(sesion.pacienteId);
  if (!viaje) redirect("/cuidador");

  const cfg = CONFIG_ESTADO[viaje.estado];

  return (
    <main className="flex-1 flex flex-col px-6 pt-8 min-h-full">
      <Link href="/cuidador/ahora" className="text-sm text-text-muted hover:text-text mb-6">
        ← Volver
      </Link>

      <div className="flex-1 flex flex-col items-center text-center pt-4">
        <p
          className={`hp-in-pop text-6xl mb-4 ${viaje.estado === "rojo" ? "hp-pulse" : ""}`}
          style={{ color: cfg.color }}
          aria-hidden="true"
        >
          {cfg.simbolo}
        </p>
        <h1 className="hp-in font-serif text-xl mb-3" style={{ animationDelay: "80ms" }}>
          {cfg.titulo}
        </h1>
        <p className="hp-in text-base text-text-muted leading-relaxed max-w-xs mb-8" style={{ animationDelay: "140ms" }}>
          {cfg.detalle}
        </p>

        {viaje.resultadoPendiente && (
          <div
            className="hp-in w-full max-w-xs rounded-lg border border-border bg-surface-1 p-4 mb-4 text-left"
            style={{ animationDelay: "200ms" }}
          >
            <p className="text-sm font-medium">{viaje.resultadoPendiente.tipo}</p>
            <p className="text-sm text-text-muted">
              Solicitado {formatearFecha(viaje.resultadoPendiente.solicitadoEn)}
            </p>
          </div>
        )}

        {viaje.proximaConsulta?.programadoPara && (
          <div
            className="hp-in w-full max-w-xs rounded-lg border border-border bg-surface-1 p-4 text-left"
            style={{ animationDelay: "250ms" }}
          >
            <p className="text-sm font-medium">Tu próxima cita</p>
            <p className="text-sm text-text-muted">
              {formatearFecha(viaje.proximaConsulta.programadoPara)}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
