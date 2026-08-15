/**
 * Semáforo de riesgo (D1/D4) — misma señal que el motor de riesgo
 * (src/lib/risk-engine.ts, src/lib/queries.ts: listarPacientesClinico),
 * traducida a verde/amarillo/rojo para un vistazo rápido en la lista y en
 * la ficha. Nunca solo color — forma + ícono + texto (docs/sistema-de-
 * diseno.md §8).
 */
const CFG = {
  verde: { color: "var(--status-completado)", icono: "●", texto: "Al día" },
  amarillo: { color: "var(--status-en-curso)", icono: "◆", texto: "Seguimiento" },
  rojo: { color: "var(--status-vencido)", icono: "▲", texto: "Riesgo" },
} as const;

export function SemaforoRiesgo({
  nivel,
  motivo,
  compacto = false,
}: {
  nivel: "verde" | "amarillo" | "rojo";
  motivo?: string | null;
  compacto?: boolean;
}) {
  const cfg = CFG[nivel];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${
        compacto ? "text-xs px-2 py-0.5" : "text-sm px-2.5 py-1"
      } ${nivel === "rojo" && !compacto ? "hp-pulse" : ""}`}
      style={{ color: cfg.color, backgroundColor: "color-mix(in srgb, " + cfg.color + " 10%, transparent)" }}
      title={motivo ?? undefined}
    >
      <span aria-hidden="true">{cfg.icono}</span>
      {cfg.texto}
    </span>
  );
}
