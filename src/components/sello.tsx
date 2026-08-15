"use client";

/**
 * El componente insignia (docs/sistema-de-diseno.md §6.1) — el único
 * elemento con presupuesto real de diseño (docs/plan-desarrollo.md §6:
 * "el sello y la tarjeta AHORA son los únicos elementos con presupuesto de
 * pulido"). Cada escaneo de QR es un sello en el pasaporte: para el niño,
 * una estampa que colecciona; para el cuidador, constancia de que cumplió;
 * para el clínico, un evento verificado. Un mismo objeto, tres lecturas.
 */

type TipoPaso =
  | "consulta"
  | "laboratorio"
  | "imagen"
  | "farmacia"
  | "transfusion"
  | "tramite_sis"
  | "referencia"
  | "control";

// Ilustraciones reales subidas por el usuario, solo para los tipos que las
// tienen — el resto sigue con el hexágono + trazo abstracto de siempre. No
// se inventó arte para los tipos sin imagen.
const ARCHIVO_TIPO: Partial<Record<TipoPaso, string>> = {
  // Las de farmacia y laboratorio están recortadas a un cuadrado ceñido al
  // círculo del sello (los originales traían mucho margen transparente a
  // los lados, así que con object-fit: contain se veían diminutas frente
  // al de consulta, que sí venía en lienzo cuadrado).
  farmacia: "/farmacia-cropped.png",
  laboratorio: "/laboratorio-cropped.png",
  consulta: "/estetoscopio-consulta-remove-bg-io.png",
};

const ICONOS: Record<TipoPaso, string> = {
  consulta: "M -6,4 Q 0,-8 6,4",
  laboratorio: "M -3,-7 L -3,2 Q -3,7 0,7 Q 3,7 3,2 L 3,-7 M -5,-7 L 5,-7",
  imagen: "M -7,-5 L 7,-5 L 7,5 L -7,5 Z M 0,-5 L 0,5 M -7,0 L 7,0",
  farmacia: "M -2,-7 L 2,-7 L 2,-2 L 7,-2 L 7,2 L 2,2 L 2,7 L -2,7 L -2,2 L -7,2 L -7,-2 L -2,-2 Z",
  transfusion: "M 0,-8 Q 7,0 7,5 Q 7,9 0,9 Q -7,9 -7,5 Q -7,0 0,-8 Z",
  tramite_sis: "M -6,-7 L 6,-7 L 6,7 L -6,7 Z M -3,-3 L 3,-3 M -3,0 L 3,0 M -3,3 L 1,3",
  referencia: "M -6,-6 L 3,-6 L 6,-3 L 6,6 L -6,6 Z M 3,-6 L 3,-3 L 6,-3",
  control: "M -7,0 A 7,7 0 1 1 -6.3,3.5 M -7,0 L -9,-3 M -7,0 L -4,-1",
};

function hashRotacion(semilla: string): number {
  let h = 0;
  for (let i = 0; i < semilla.length; i++) h = (h * 31 + semilla.charCodeAt(i)) | 0;
  // rango -8° a 8°, determinístico por semilla: el mismo sello siempre cae
  // con el mismo ángulo, no "tiembla" entre renders.
  return ((Math.abs(h) % 17) - 8) * 1;
}

export function Sello({
  estado,
  tipo = "control",
  ubicacion,
  fecha,
  semilla,
  animar = false,
  size = 72,
}: {
  estado: "vacio" | "sellado" | "en_cola";
  tipo?: TipoPaso;
  ubicacion?: string;
  fecha?: string;
  semilla?: string;
  animar?: boolean;
  size?: number;
}) {
  const rotacion = hashRotacion(semilla ?? ubicacion ?? "hematopass");
  const color =
    estado === "sellado" ? "var(--color-sello)" : estado === "en_cola" ? "var(--surface-text-muted)" : "var(--surface-border)";
  const relleno = estado === "sellado" ? "var(--color-sello-light)" : "transparent";

  const etiqueta =
    estado === "sellado"
      ? `Sello: ${ubicacion ?? "completado"}${fecha ? `, ${fecha}` : ""}`
      : estado === "en_cola"
        ? "Sello pendiente de enviar"
        : "Paso aún no completado";

  const archivo = ARCHIVO_TIPO[tipo];
  if (archivo) {
    return (
      <div
        className="inline-flex items-center justify-center shrink-0"
        style={{
          width: size,
          height: size,
          transform: `rotate(${estado === "sellado" ? rotacion : 0}deg)`,
        }}
        role="img"
        aria-label={etiqueta}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={archivo}
          alt=""
          width={size}
          height={size}
          className={animar && estado === "sellado" ? "hp-sello-animar" : undefined}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            filter:
              estado === "vacio"
                ? "grayscale(1) opacity(0.32)"
                : estado === "en_cola"
                  ? "opacity(0.7)"
                  : undefined,
          }}
        />
      </div>
    );
  }

  const puntosHex = "50,4 93,27 93,73 50,96 7,73 7,27";

  return (
    <div
      className="inline-flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        transform: `rotate(${estado === "sellado" ? rotacion : 0}deg)`,
      }}
      role="img"
      aria-label={etiqueta}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={animar && estado === "sellado" ? "hp-sello-animar" : undefined}
      >
        <polygon
          points={puntosHex}
          fill={relleno}
          stroke={color}
          strokeWidth={estado === "vacio" ? 3 : 4}
          strokeDasharray={estado === "vacio" ? "6 5" : undefined}
          strokeLinejoin="round"
        />
        {estado !== "vacio" && (
          <path
            d={ICONOS[tipo]}
            transform="translate(50 42)"
            fill="none"
            stroke={color}
            strokeWidth={3.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={estado === "en_cola" ? 0.6 : 1}
          />
        )}
        {estado === "sellado" && ubicacion && (
          <text
            x="50"
            y="82"
            textAnchor="middle"
            fontSize="9"
            fontFamily="var(--font-family-sans)"
            fontWeight={700}
            fill={color}
          >
            {ubicacion.length > 14 ? `${ubicacion.slice(0, 13)}…` : ubicacion}
          </text>
        )}
      </svg>
    </div>
  );
}
