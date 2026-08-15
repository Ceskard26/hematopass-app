import { redirect } from "next/navigation";
import { leerSesionCuidador } from "@/lib/cuidador-session";
import { obtenerRutaParaCuidador, resultadosDePaciente } from "@/lib/queries-cuidador";
import { Sello } from "@/components/sello";
import { FASE_LABEL } from "@/lib/fase-tratamiento";

const ESTADO_RESULTADO_CFG: Record<string, { label: string; color: string }> = {
  pendiente: { label: "En proceso", color: "var(--status-en-curso)" },
  listo: { label: "Listo", color: "var(--status-completado)" },
  entregado: { label: "Entregado", color: "var(--status-completado)" },
};

function formatearFecha(fecha: Date | string | null) {
  if (!fecha) return null;
  return new Date(fecha).toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
}

export default async function PasaportePage() {
  const sesion = await leerSesionCuidador();
  if (!sesion) redirect("/cuidador");

  const [detalle, resultados] = await Promise.all([
    obtenerRutaParaCuidador(sesion.pacienteId),
    resultadosDePaciente(sesion.pacienteId),
  ]);
  if (!detalle) redirect("/cuidador");

  const { paciente: p, rutaActiva, pasos } = detalle;
  const sellados = pasos.filter((x) => x.estado === "completado").length;
  const faseActual = rutaActiva ? (FASE_LABEL[rutaActiva.fase] ?? rutaActiva.fase) : null;

  return (
    <main className="px-6 pt-8 min-h-full">
      <h1 className="font-serif text-lg mb-1">Mi pasaporte</h1>
      <p className="text-sm text-text-muted mb-1">
        {p.nombre.split(" ")[0]} · {sellados} sello{sellados === 1 ? "" : "s"} de {pasos.length}
      </p>
      {faseActual && (
        <p className="hp-in mb-8 inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium">
          <span aria-hidden="true">⬡</span> Fase actual: {faseActual}
        </p>
      )}
      {!faseActual && <div className="mb-8" />}

      {resultados.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3">
            Resultados
          </h2>
          <ul className="space-y-2">
            {resultados.map((r) => {
              const cfg = ESTADO_RESULTADO_CFG[r.estado] ?? ESTADO_RESULTADO_CFG.pendiente;
              return (
                <li
                  key={r.id}
                  className="hp-in flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-1 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.tipo}</p>
                    <p className="text-xs text-text-muted">
                      {r.estado === "pendiente"
                        ? `Solicitado ${formatearFecha(r.solicitadoEn)}`
                        : `Listo ${formatearFecha(r.listoEn)}`}
                    </p>
                  </div>
                  <span
                    className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium"
                    style={{ color: cfg.color }}
                  >
                    <span aria-hidden="true">{r.estado === "pendiente" ? "◑" : "✓"}</span>
                    {cfg.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3">
        Tu ruta — lo que ya pasó y lo que sigue
      </h2>
      {pasos.length === 0 ? (
        <p className="text-sm text-text-muted italic">Todavía no hay pasos registrados.</p>
      ) : (
        <ol className="space-y-3">
          {pasos.map((paso, i) => {
            const sellado = paso.estado === "completado";
            return (
              <li
                key={paso.id}
                className="hp-in rounded-lg border border-border bg-surface-1 px-4 py-3.5"
                style={{ animationDelay: `${Math.min(i, 10) * 45}ms` }}
              >
                <div className="flex items-center gap-4">
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
                      {/* "tengo cita programada a X día" — antes un paso pendiente solo
                          decía "Pendiente", sin fecha; ahora muestra cuándo es. */}
                      {!sellado && paso.programadoPara
                        ? ` · ${paso.estado === "vencido" ? "vencía " : "programado "}${formatearFecha(paso.programadoPara)}`
                        : ""}
                    </p>
                  </div>
                  {!sellado && (
                    <span
                      className="shrink-0 text-xs italic"
                      style={{ color: paso.estado === "vencido" ? "var(--status-vencido)" : "var(--surface-text-muted)" }}
                    >
                      {paso.estado === "vencido" ? "Vencido" : "Pendiente"}
                    </span>
                  )}
                </div>
                {/* "qué me dijo/concluyó/diagnosticó el médico" — pedido directo del
                    usuario, reemplaza la regla original de no mostrar diagnóstico. */}
                {paso.notaMedica && (
                  <p className="mt-2.5 pl-[72px] text-sm leading-relaxed text-text-muted">
                    <span aria-hidden="true">✎</span> “{paso.notaMedica}”
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
