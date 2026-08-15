import { redirect } from "next/navigation";
import Link from "next/link";
import { leerSesionCuidador } from "@/lib/cuidador-session";
import { obtenerRutaParaCuidador, resultadosDePaciente } from "@/lib/queries-cuidador";
import { Sello } from "@/components/sello";
import { Mascota } from "@/components/mascota";
import { FASE_LABEL } from "@/lib/fase-tratamiento";

// Sellos de nivel ilustrados, subidos por el usuario — solo existe el de
// nivel 2 por ahora. Los niveles sin imagen siguen con la píldora de
// siempre, no se inventa arte para los que faltan.
// Recortado a un cuadrado ceñido al círculo de soga — el original venía en
// un lienzo panorámico con mucho margen, así que a tamaño de badge (28px)
// se veía casi invisible.
const NIVEL_SELLO: Partial<Record<number, string>> = {
  2: "/sellonivel2-cropped.jpg",
};

const ESTADO_RESULTADO_CFG: Record<string, { label: string; color: string }> = {
  pendiente: { label: "En proceso", color: "var(--status-en-curso)" },
  listo: { label: "Listo", color: "var(--status-completado)" },
  entregado: { label: "Entregado", color: "var(--status-completado)" },
};

function formatearFecha(fecha: Date | string | null) {
  if (!fecha) return null;
  return new Date(fecha).toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
}

/**
 * Nodo del "mapa" — reutiliza Sello (docs/sistema-de-diseno.md §6.1, "único
 * elemento con presupuesto real de diseño") en vez de inventar un ícono de
 * isla nuevo. "activo" es una capa visual encima (anillo + etiqueta), no un
 * estado nuevo de Sello.
 */
type EstadoNodo = "completado" | "activo" | "bloqueado";

function estadoNodo(pasoEstado: string, esActual: boolean): EstadoNodo {
  if (pasoEstado === "completado") return "completado";
  if (esActual) return "activo";
  return "bloqueado";
}

export default async function PasaportePage() {
  const sesion = await leerSesionCuidador();
  if (!sesion) redirect("/cuidador");

  const [detalle, resultados] = await Promise.all([
    obtenerRutaParaCuidador(sesion.pacienteId),
    resultadosDePaciente(sesion.pacienteId),
  ]);
  if (!detalle) redirect("/cuidador");

  const { paciente: p, rutaActiva, pasos, pasoActual } = detalle;
  const sellados = pasos.filter((x) => x.estado === "completado").length;
  const faseActual = rutaActiva ? (FASE_LABEL[rutaActiva.fase] ?? rutaActiva.fase) : null;

  const mensajeMascota = pasoActual
    ? `¡Vamos avanzando! Ahora toca: ${pasoActual.ubicacion?.nombre ?? "el siguiente paso"}.`
    : pasos.length > 0
      ? "¡Completaste todos los pasos de tu ruta por ahora!"
      : "Todavía no tenemos pasos para tu ruta.";

  return (
    <main className="px-5 pt-6 min-h-full">
      <div className="hp-in flex items-center justify-between mb-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary flex items-center gap-1">
          <span aria-hidden="true">⬡</span> Mapa de ruta
        </p>
        {NIVEL_SELLO[sellados] ? (
          <span className="flex items-center gap-2 rounded-full pl-1 pr-3.5 py-1" style={{ backgroundColor: "var(--color-sello-light)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={NIVEL_SELLO[sellados]}
              alt=""
              width={44}
              height={44}
              className="h-11 w-11 rounded-full object-cover shrink-0"
            />
            <span className="text-sm font-bold" style={{ color: "var(--color-sello-ink)" }}>
              Nivel {sellados}
            </span>
          </span>
        ) : (
          <span
            className="text-xs font-bold rounded-full px-3 py-1"
            style={{ backgroundColor: "var(--color-sello-light)", color: "var(--color-sello-ink)" }}
          >
            ★ Nivel {sellados}
          </span>
        )}
      </div>
      <h1 className="hp-in font-serif text-lg mb-1">{p.nombre.split(" ")[0]}</h1>
      <p className="text-sm text-text-muted mb-1">
        {sellados} sello{sellados === 1 ? "" : "s"} de {pasos.length}
      </p>
      {faseActual && (
        <p className="hp-in mb-4 inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium">
          <span aria-hidden="true">⬡</span> Fase actual: {faseActual}
        </p>
      )}
      {!faseActual && <div className="mb-4" />}

      <div className="hp-in-fast flex items-center gap-2 rounded-2xl bg-surface-1 shadow-sm pl-2 pr-4 py-2 mb-6">
        <Mascota estado={pasoActual ? "animando" : "celebrando"} size={112} className="shrink-0 -my-4" />
        <p className="text-sm leading-relaxed">“{mensajeMascota}”</p>
      </div>

      {resultados.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3">
            Resultados
          </h2>
          <div className="rounded-2xl bg-surface-1 shadow-sm divide-y divide-border overflow-hidden">
            {resultados.map((r) => {
              const cfg = ESTADO_RESULTADO_CFG[r.estado] ?? ESTADO_RESULTADO_CFG.pendiente;
              return (
                <div key={r.id} className="hp-in flex items-center justify-between gap-3 px-4 py-3">
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
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="px-1 mb-8">
        <h2 className="text-sm font-bold uppercase tracking-wide mb-4" style={{ color: "var(--accent-sello)" }}>
          Tu ruta
        </h2>
        {pasos.length === 0 ? (
          <p className="text-sm text-text-muted italic">Todavía no hay pasos registrados.</p>
        ) : (
          <ol className="space-y-0">
            {pasos.map((paso, i) => {
              const nodo = estadoNodo(paso.estado, paso.id === pasoActual?.id);
              const esUltimo = i === pasos.length - 1;
              return (
                <li key={paso.id} className="hp-in relative pl-[88px] pb-7 last:pb-0" style={{ animationDelay: `${Math.min(i, 10) * 45}ms` }}>
                  {!esUltimo && (
                    <span
                      className="absolute left-9 top-[72px] bottom-0 w-0 border-l-2 border-dashed"
                      style={{
                        borderColor:
                          nodo === "completado" ? "var(--color-sello)" : "var(--surface-border)",
                      }}
                      aria-hidden="true"
                    />
                  )}
                  <div
                    className="absolute left-0 top-0 rounded-full"
                    style={
                      nodo === "activo"
                        ? { boxShadow: "0 0 0 4px color-mix(in srgb, var(--status-en-curso) 25%, transparent)" }
                        : undefined
                    }
                  >
                    <Sello
                      estado={nodo === "bloqueado" ? "vacio" : "sellado"}
                      tipo={paso.tipo}
                      ubicacion={paso.ubicacion?.nombre}
                      semilla={paso.id}
                      size={72}
                    />
                  </div>

                  <div className="min-h-[72px] flex flex-col justify-center">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-base font-semibold truncate">
                        {paso.ubicacion?.nombre ?? paso.instruccionCuidador}
                      </p>
                      {nodo === "activo" && (
                        <span
                          className="shrink-0 text-xs font-bold rounded-full px-2 py-0.5"
                          style={{ backgroundColor: "var(--status-en-curso)", color: "#fff" }}
                        >
                          Activo
                        </span>
                      )}
                      {nodo === "bloqueado" && (
                        <span className="shrink-0 text-xs italic text-text-muted">Bloqueado</span>
                      )}
                    </div>
                    <p className="text-sm text-text-muted">
                      {nodo === "completado" && paso.completadoEn
                        ? `Completado ${formatearFecha(paso.completadoEn)}`
                        : paso.programadoPara
                          ? `${paso.estado === "vencido" ? "Vencía " : "Programado "}${formatearFecha(paso.programadoPara)}`
                          : "Pendiente"}
                    </p>
                    {nodo !== "bloqueado" && (
                      <p className="text-sm text-text-muted mt-1 leading-relaxed">
                        {paso.instruccionCuidador}
                      </p>
                    )}
                    {/* "qué me dijo/concluyó/diagnosticó el médico" — pedido directo del
                        usuario, reemplaza la regla original de no mostrar diagnóstico. */}
                    {paso.notaMedica && (
                      <>
                        <p className="mt-2 text-sm leading-relaxed text-text-muted">
                          <span aria-hidden="true">✎</span> “{paso.notaMedica}”
                        </p>
                        <Link
                          href={`/cuidador/resumen/${paso.id}`}
                          className="hp-press mt-1.5 inline-block text-sm text-primary underline"
                        >
                          Ver resumen completo
                        </Link>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </main>
  );
}
