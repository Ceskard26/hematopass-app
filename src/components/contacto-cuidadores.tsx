/**
 * Visibilidad de contacto por paciente para el personal clínico — pedido
 * directo del usuario: así como el cuidador puede compartir su avance por
 * WhatsApp, el equipo clínico necesita poder llamar o escribir a la
 * familia sin salir de la ficha/bandeja. `cuidador.telefono` ya existía en
 * el esquema pero no se mostraba en ningún lado del lado clínico.
 */

type CuidadorContacto = {
  cuidador: {
    id: string;
    nombre: string;
    relacion: string;
    telefono: string | null;
  };
};

function soloDigitos(telefono: string) {
  return telefono.replace(/\D/g, "");
}

export function ContactoCuidadores({
  cuidadores,
  pacienteNombre,
  compacto = false,
  soloIconos = false,
}: {
  cuidadores: CuidadorContacto[];
  pacienteNombre: string;
  compacto?: boolean;
  soloIconos?: boolean;
}) {
  if (cuidadores.length === 0) {
    return <p className="text-xs text-text-muted italic">Sin cuidador registrado.</p>;
  }

  const mensaje = (nombreCuidador: string) =>
    `Hola ${nombreCuidador.split(" ")[0]}, le escribe el equipo de Hematopass sobre ${pacienteNombre.split(" ")[0]}.`;

  return (
    <ul className={compacto ? "flex flex-wrap gap-3" : "space-y-2.5"}>
      {cuidadores.map(({ cuidador: c }) => (
        <li
          key={c.id}
          className={
            compacto
              ? "flex items-center gap-2"
              : "flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
          }
        >
          {!soloIconos && (
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{c.nombre}</p>
              <p className="text-xs text-text-muted capitalize">{c.relacion}</p>
            </div>
          )}
          {c.telefono ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href={`tel:${soloDigitos(c.telefono)}`}
                aria-label={`Llamar a ${c.nombre}`}
                title={c.telefono}
                className="hp-press inline-flex items-center justify-center h-8 w-8 rounded-full border border-border hover:bg-surface-2"
              >
                <span aria-hidden="true">☏</span>
              </a>
              <a
                href={`https://wa.me/${soloDigitos(c.telefono)}?text=${encodeURIComponent(mensaje(c.nombre))}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Escribir a ${c.nombre} por WhatsApp`}
                title="WhatsApp"
                className="hp-press inline-flex items-center justify-center h-8 w-8 rounded-full border border-border hover:bg-surface-2"
              >
                <span aria-hidden="true">◐</span>
              </a>
            </div>
          ) : (
            <span className="text-xs text-text-muted italic shrink-0">Sin teléfono</span>
          )}
        </li>
      ))}
    </ul>
  );
}
