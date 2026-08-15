"use client";

/**
 * Mascota de la app del cuidador — acompaña al niño y a la familia en las
 * pantallas de bienvenida, estados vacíos y celebraciones. SVG hecho a mano,
 * sin asset externo (misma razón que sello.tsx: "cero dependencia de red
 * para renderizar", docs/sistema-de-diseno.md §8).
 *
 * Solo se usa en src/app/cuidador/* — el lado del doctor no la importa.
 * Reversa deliberadamente, solo para esta superficie, la regla original de
 * "sin gota de sangre, sin vocabulario médico de stock"
 * (docs/sistema-de-diseno.md §3) — por pedido explícito del usuario.
 */

type Estado = "feliz" | "animando" | "celebrando";

const OJOS_ABIERTOS = { cy: 74, r: 5.5 };

export function Mascota({
  estado = "feliz",
  size = 96,
  className,
}: {
  estado?: Estado;
  size?: number;
  className?: string;
}) {
  const etiqueta =
    estado === "celebrando"
      ? "Mascota celebrando"
      : estado === "animando"
        ? "Mascota animándote a seguir"
        : "Mascota sonriendo";

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 ${className ?? ""}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={etiqueta}
    >
      <svg viewBox="0 0 100 120" width={size} height={size}>
        {/* Chispas de celebración, detrás del cuerpo */}
        {estado === "celebrando" && (
          <g stroke="var(--mascot-highlight)" strokeWidth={3} strokeLinecap="round">
            <path d="M 12 20 L 12 30 M 7 25 L 17 25" />
            <path d="M 88 15 L 88 25 M 83 20 L 93 20" />
            <path d="M 82 55 L 82 63 M 78 59 L 86 59" />
          </g>
        )}

        {/* Brazo levantado, detrás del cuerpo para que la mano quede al frente */}
        {(estado === "animando" || estado === "celebrando") && (
          <path
            d="M 78 82 Q 94 78 92 56"
            fill="none"
            stroke="var(--mascot-body)"
            strokeWidth={9}
            strokeLinecap="round"
          />
        )}
        {estado === "celebrando" && (
          <path
            d="M 22 82 Q 6 78 8 56"
            fill="none"
            stroke="var(--mascot-body)"
            strokeWidth={9}
            strokeLinecap="round"
          />
        )}

        {/* Cuerpo: gota redondeada */}
        <path
          d="M 50 6 C 21 44 10 68 10 84 C 10 104 28 116 50 116 C 72 116 90 104 90 84 C 90 68 79 44 50 6 Z"
          fill="var(--mascot-body)"
        />

        {/* Brillo del cuerpo */}
        <ellipse cx="34" cy="40" rx="7" ry="11" fill="var(--mascot-highlight)" opacity={0.5} />

        {/* Mejillas */}
        <circle cx="27" cy="86" r="5" fill="var(--mascot-cheek)" opacity={0.7} />
        <circle cx="73" cy="86" r="5" fill="var(--mascot-cheek)" opacity={0.7} />

        {/* Cara */}
        {estado === "celebrando" ? (
          <g stroke="var(--mascot-face)" strokeWidth={3.5} strokeLinecap="round" fill="none">
            <path d="M 32 72 Q 37 66 42 72" />
            <path d="M 58 72 Q 63 66 68 72" />
          </g>
        ) : (
          <g fill="var(--mascot-face)">
            <circle cx="38" cy={OJOS_ABIERTOS.cy} r={OJOS_ABIERTOS.r} />
            <circle cx="62" cy={OJOS_ABIERTOS.cy} r={OJOS_ABIERTOS.r} />
          </g>
        )}
        <path
          d={estado === "celebrando" ? "M 36 90 Q 50 102 64 90" : "M 38 88 Q 50 98 62 88"}
          fill="none"
          stroke="var(--mascot-face)"
          strokeWidth={3.5}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
