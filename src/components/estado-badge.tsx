import { cn } from "@/lib/utils";

/**
 * Regla dura (docs/sistema-de-diseno.md §5): el color nunca comunica solo.
 * Cada estado lleva forma + símbolo + etiqueta de texto — daltonismo,
 * pantallas baratas, luz de pasillo hospitalario, uso bajo estrés.
 */
const ESTADOS = {
  programado: { label: "Programado", color: "var(--status-programado)", simbolo: "○" },
  notificado: { label: "Notificado", color: "var(--status-notificado)", simbolo: "◔" },
  en_curso: { label: "En curso", color: "var(--status-en-curso)", simbolo: "◑" },
  completado: { label: "Completado", color: "var(--status-completado)", simbolo: "✓" },
  vencido: { label: "Vencido", color: "var(--status-vencido)", simbolo: "▲" },
  reprogramado: { label: "Reprogramado", color: "var(--status-en-curso)", simbolo: "↻" },
  no_asistio: { label: "No asistió", color: "var(--status-vencido)", simbolo: "✕" },
} as const;

export type EstadoPaso = keyof typeof ESTADOS;

export function EstadoBadge({ estado, className }: { estado: EstadoPaso; className?: string }) {
  const cfg = ESTADOS[estado];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        className
      )}
      style={{ borderColor: cfg.color, color: cfg.color }}
    >
      <span aria-hidden="true">{cfg.simbolo}</span>
      {cfg.label}
    </span>
  );
}
