import { notFound } from "next/navigation";
import Link from "next/link";
import { obtenerPacienteDetalle, listarUbicaciones } from "@/lib/queries";
import { EstadoBadge, type EstadoPaso } from "@/components/estado-badge";
import { GenerarPasoPanel } from "@/components/generar-paso-panel";
import { LiveRefresher } from "@/components/live-refresher";
import { NotaMedicaForm } from "@/components/nota-medica-form";
import { SemaforoRiesgo } from "@/components/semaforo-riesgo";

function edadEnAnios(fechaNacimiento: string) {
  const nacimiento = new Date(fechaNacimiento);
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const aunNoCumple =
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());
  if (aunNoCumple) edad--;
  return edad;
}

// "reprogramado" y "no_asistio" no tienen token propio — reutilizan el color
// de en_curso/vencido, igual que estado-badge.tsx. Construir el nombre de la
// variable CSS a partir del estado (`--status-${estado}`) se rompe en
// silencio para estos dos: la variable no existe y el borde queda sin color.
const COLOR_ESTADO: Record<string, string> = {
  programado: "var(--status-programado)",
  notificado: "var(--status-notificado)",
  en_curso: "var(--status-en-curso)",
  completado: "var(--status-completado)",
  vencido: "var(--status-vencido)",
  reprogramado: "var(--status-en-curso)",
  no_asistio: "var(--status-vencido)",
};

function formatearFecha(fecha: Date | string | null) {
  if (!fecha) return null;
  return new Date(fecha).toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function FichaPacientePage(props: PageProps<"/clinico/[codigo]">) {
  const { codigo } = await props.params;
  const [detalle, ubicaciones] = await Promise.all([
    obtenerPacienteDetalle(codigo),
    listarUbicaciones(),
  ]);

  if (!detalle) notFound();
  const { paciente: p, rutaActiva, semaforo, alertaMotivo } = detalle;
  const pasos = rutaActiva?.pasos ?? [];
  const resultadosPendientes = p.resultados.filter((r) => !r.listoEn);

  return (
    <main className="p-8 max-w-[1200px]">
      <LiveRefresher pacienteId={p.id} />
      <Link href="/clinico" className="text-xs text-text-muted hover:text-text">
        ← Pacientes
      </Link>

      <div className="hp-in flex items-start justify-between mt-2 mb-8">
        <div>
          <h1 className="font-serif text-lg">{p.nombre}</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {p.codigo} · {edadEnAnios(p.fechaNacimiento)} años · {p.sexo} · {p.dxNombre}
          </p>
          {p.esProvincia && (
            <p className="text-xs mt-1 inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5">
              <span aria-hidden="true">✈</span> Familia de {p.departamento}
            </p>
          )}
        </div>
        <SemaforoRiesgo nivel={semaforo} motivo={alertaMotivo} />
      </div>

      {resultadosPendientes.length > 0 && (
        <div className="hp-in-fast mb-6 rounded-md border border-status-en-curso/40 bg-status-en-curso/5 px-4 py-3">
          <p className="text-sm font-medium" style={{ color: "var(--status-en-curso)" }}>
            Resultado pendiente
          </p>
          {resultadosPendientes.map((r) => (
            <p key={r.id} className="text-xs text-text-muted">
              {r.tipo} — solicitado {formatearFecha(r.solicitadoEn)}
            </p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-[1fr_320px] gap-8">
        <section>
          <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3">
            Ruta asistencial
          </h2>
          {pasos.length === 0 ? (
            <p className="text-sm text-text-muted italic">Sin pasos registrados todavía.</p>
          ) : (
            <ol className="space-y-0">
              {pasos.map((paso, i) => (
                <li
                  key={paso.id}
                  className="hp-in relative pl-6 pb-6 last:pb-0"
                  style={{ animationDelay: `${Math.min(i, 10) * 50}ms` }}
                >
                  {i < pasos.length - 1 && (
                    <span className="absolute left-[7px] top-4 bottom-0 w-px bg-border" />
                  )}
                  <span
                    className="absolute left-0 top-1 h-3.5 w-3.5 rounded-full border-2 bg-surface-1"
                    style={{ borderColor: COLOR_ESTADO[paso.estado] ?? "var(--status-programado)" }}
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{paso.tituloClinico}</p>
                    <EstadoBadge estado={paso.estado as EstadoPaso} />
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    {paso.ubicacion?.nombre}
                    {paso.ubicacion?.ventanilla ? ` · ${paso.ubicacion.ventanilla}` : ""}
                    {" · "}
                    {formatearFecha(paso.completadoEn ?? paso.programadoPara) ?? "sin fecha"}
                  </p>
                  <p className="text-xs italic text-text-muted mt-1">
                    Familia ve: “{paso.instruccionCuidador}”
                  </p>
                  <NotaMedicaForm
                    pasoId={paso.id}
                    pacienteCodigo={p.codigo}
                    notaActual={paso.notaMedica}
                  />
                </li>
              ))}
            </ol>
          )}
        </section>

        <aside>
          <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3">
            Generar siguiente paso
          </h2>
          <GenerarPasoPanel
            pacienteCodigo={p.codigo}
            rutaId={rutaActiva?.id ?? null}
            ubicaciones={ubicaciones}
          />
        </aside>
      </div>
    </main>
  );
}
