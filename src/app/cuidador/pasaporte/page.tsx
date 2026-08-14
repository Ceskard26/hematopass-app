import { redirect } from "next/navigation";
import { leerSesionCuidador } from "@/lib/cuidador-session";
import { obtenerRutaParaCuidador } from "@/lib/queries-cuidador";
import { Sello } from "@/components/sello";

function formatearFecha(fecha: Date | string | null) {
  if (!fecha) return null;
  return new Date(fecha).toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
}

export default async function PasaportePage() {
  const sesion = await leerSesionCuidador();
  if (!sesion) redirect("/cuidador");

  const detalle = await obtenerRutaParaCuidador(sesion.pacienteId);
  if (!detalle) redirect("/cuidador");

  const { paciente: p, pasos } = detalle;
  const sellados = pasos.filter((x) => x.estado === "completado").length;

  return (
    <main className="px-6 pt-8 min-h-full">
      <h1 className="font-serif text-lg mb-1">Mi pasaporte</h1>
      <p className="text-sm text-text-muted mb-8">
        {p.nombre.split(" ")[0]} · {sellados} sello{sellados === 1 ? "" : "s"} de {pasos.length}
      </p>

      {pasos.length === 0 ? (
        <p className="text-sm text-text-muted italic">Todavía no hay pasos registrados.</p>
      ) : (
        <ol className="space-y-3">
          {pasos.map((paso) => {
            const sellado = paso.estado === "completado";
            return (
              <li
                key={paso.id}
                className="flex items-center gap-4 rounded-lg border border-border bg-surface-1 px-4 py-3.5"
              >
                <Sello
                  estado={sellado ? "sellado" : "vacio"}
                  tipo={paso.tipo}
                  ubicacion={paso.ubicacion?.nombre}
                  semilla={paso.id}
                  size={56}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-base font-medium truncate">{paso.instruccionCuidador}</p>
                  <p className="text-sm text-text-muted">
                    {paso.ubicacion?.nombre}
                    {sellado && paso.completadoEn
                      ? ` · ${formatearFecha(paso.completadoEn)}`
                      : ""}
                  </p>
                </div>
                {!sellado && (
                  <span className="shrink-0 text-xs text-text-muted italic">Pendiente</span>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
