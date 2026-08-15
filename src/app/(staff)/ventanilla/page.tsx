import { obtenerPacienteDetalle } from "@/lib/queries";
import { EstadoBadge, type EstadoPaso } from "@/components/estado-badge";
import { ContactoCuidadores } from "@/components/contacto-cuidadores";
import { PLANTILLAS_PASO } from "@/lib/plantillas-paso";

function formatearFecha(fecha: Date | string | null) {
  if (!fecha) return null;
  return new Date(fecha).toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Búsqueda por código de pasaporte, para el personal de ventanilla: qué
 * paso trae pendiente el paciente y a quién llamar si no se presenta. Antes
 * era un stub sin ninguna función real; reutiliza obtenerPacienteDetalle
 * (la misma lectura que la ficha clínica), sin dato ni acción nueva.
 */
export default async function VentanillaPage(props: PageProps<"/ventanilla">) {
  const searchParams = await props.searchParams;
  const codigoBuscado = typeof searchParams.codigo === "string" ? searchParams.codigo.trim() : "";
  const detalle = codigoBuscado
    ? await obtenerPacienteDetalle(codigoBuscado.toUpperCase())
    : null;
  const pasos = detalle?.rutaActiva?.pasos ?? [];
  const pasosPendientes = pasos.filter((p) =>
    ["programado", "notificado", "en_curso", "vencido"].includes(p.estado)
  );

  return (
    <main className="p-8 max-w-[720px]">
      <h1 className="font-serif text-lg mb-1">Ventanilla</h1>
      <p className="text-sm text-text-muted mb-6">
        Busca al paciente por su código de pasaporte para ver su paso pendiente y el contacto de
        su familia.
      </p>

      <form action="/ventanilla" className="flex gap-2 mb-8">
        <input
          name="codigo"
          type="text"
          defaultValue={codigoBuscado}
          placeholder="HP-00001"
          autoCapitalize="characters"
          className="flex-1 rounded-md border border-border bg-surface-1 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          className="hp-press rounded-md bg-primary text-primary-ink px-5 py-2 text-sm font-semibold hover:opacity-90"
        >
          Buscar
        </button>
      </form>

      {codigoBuscado && !detalle && (
        <p className="text-sm text-text-muted italic">
          No encontramos ningún paciente con el código “{codigoBuscado}”.
        </p>
      )}

      {detalle && (
        <div className="hp-in rounded-lg border border-border bg-surface-1 p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="font-serif text-md">{detalle.paciente.nombre}</h2>
              <p className="text-xs text-text-muted mt-0.5">
                {detalle.paciente.codigo} · {detalle.paciente.dxNombre}
              </p>
            </div>
          </div>

          <h3 className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
            Pasos pendientes
          </h3>
          {pasosPendientes.length === 0 ? (
            <p className="text-sm text-text-muted italic mb-5">
              Sin pasos pendientes en la ruta activa.
            </p>
          ) : (
            <ul className="space-y-2 mb-5">
              {pasosPendientes.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {PLANTILLAS_PASO[p.tipo]?.etiqueta ?? p.tituloClinico}
                    </p>
                    <p className="text-xs text-text-muted">
                      {p.ubicacion?.nombre}
                      {p.programadoPara ? ` · ${formatearFecha(p.programadoPara)}` : ""}
                    </p>
                  </div>
                  <EstadoBadge estado={p.estado as EstadoPaso} />
                </li>
              ))}
            </ul>
          )}

          <h3 className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
            Contacto de la familia
          </h3>
          <ContactoCuidadores
            cuidadores={detalle.paciente.cuidadores}
            pacienteNombre={detalle.paciente.nombre}
          />
        </div>
      )}
    </main>
  );
}
