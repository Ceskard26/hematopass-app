/**
 * Mascota de la app del cuidador ("Globi") — acompaña al niño y a la
 * familia en las pantallas de bienvenida, el mapa de ruta, confirmaciones y
 * el resumen post-consulta. Ilustraciones subidas por el usuario en
 * /public (globi-*-remove-bg-io.*), no un SVG hecho a mano — cada estado
 * usa el dibujo con la pose/props correctas para esa pantalla en vez de
 * reusar una sola imagen genérica.
 *
 * Solo se usa en src/app/cuidador/* — el lado del doctor no la importa.
 * Reversa deliberadamente, solo para esta superficie, la regla original de
 * "sin gota de sangre, sin vocabulario médico de stock"
 * (docs/sistema-de-diseno.md §3) — por pedido explícito del usuario.
 */

type Estado =
  | "feliz" // bienvenida: saludando con un mapa enrollado — pantallas de entrada/login
  | "animando" // aventurero: explorando con sombrero — mapa de ruta, paso en curso
  | "celebrando" // con medalla: brazos arriba — todo al día, paso completado
  | "calendario" // señalando un calendario — citas y recordatorios
  | "notas" // tablero + lápiz — resumen post-consulta
  | "aprobando" // pulgar arriba — confirmaciones
  | "empatico"; // mano en el pecho — espera, tranquilidad, estados de alerta

const ARCHIVO: Record<Estado, string> = {
  feliz: "/globi-bienvenida-remove-bg-io.png",
  animando: "/globi-aventurero-remove-bg-io.png",
  celebrando: "/globi-conmedalla-remove-bg-io.png",
  calendario: "/globi-calendario-remove-bg-io.webp",
  notas: "/globi-connotaspostconsulta-remove-bg-io.png",
  aprobando: "/globi-dandook-remove-bg-io.png",
  empatico: "/globi-empatico-remove-bg-io.png",
};

const ETIQUETA: Record<Estado, string> = {
  feliz: "Globi saludando de bienvenida",
  animando: "Globi explorando el mapa de ruta",
  celebrando: "Globi celebrando con una medalla",
  calendario: "Globi señalando el calendario",
  notas: "Globi con el resumen de la consulta",
  aprobando: "Globi aprobando con el pulgar arriba",
  empatico: "Globi acompañando con calma",
};

export function Mascota({
  estado = "feliz",
  size = 96,
  className,
}: {
  estado?: Estado;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ARCHIVO[estado]}
        alt={ETIQUETA[estado]}
        width={size}
        height={size}
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
    </div>
  );
}
