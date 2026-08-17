import { redirect } from "next/navigation";
import Link from "next/link";
import { leerSesionCuidador } from "@/lib/cuidador-session";
import {
  obtenerRutaParaCuidador,
  obtenerCuidador,
  pacientesDeCuidador,
  evaluarViaje,
} from "@/lib/queries-cuidador";
import { LiveRefresher } from "@/components/live-refresher";
import { Mascota } from "@/components/mascota";
import { leerIdioma } from "@/lib/idioma-cuidador";
import { t } from "@/lib/i18n-cuidador";

/**
 * "Tengo cita programada a X día y tiene que salir ahí" — pedido directo
 * del usuario. programadoPara existía en el dato pero no se mostraba en la
 * Tarjeta AHORA, solo el destino: la familia sabía A DÓNDE ir pero no
 * CUÁNDO. "Hoy"/"Mañana" en vez de la fecha pelada — es más rápido de leer
 * de un vistazo, que es el punto entero de esta pantalla.
 */
function formatearCuando(fecha: Date | string) {
  const d = new Date(fecha);
  const hoy = new Date();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const inicioDia = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDias = Math.round((inicioDia.getTime() - inicioHoy.getTime()) / 86_400_000);

  const hora = d.toLocaleTimeString("es-PE", { hour: "numeric", minute: "2-digit", timeZone: "America/Lima" });
  if (diffDias === 0) return `Hoy · ${hora}`;
  if (diffDias === 1) return `Mañana · ${hora}`;
  if (diffDias === -1) return `Ayer · ${hora}`;
  const fechaCorta = d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", timeZone: "America/Lima" });
  return `${fechaCorta} · ${hora}`;
}

const ICONO_TIPO: Record<string, string> = {
  consulta: "◔",
  laboratorio: "◑",
  imagen: "◐",
  farmacia: "◒",
  transfusion: "●",
  tramite_sis: "◓",
  referencia: "◕",
  control: "◔",
};

// Consejos logísticos, no clínicos — nunca recomendación médica. Rotan por
// día del mes para que no sea el mismo consejo toda la semana, sin
// necesitar una tabla nueva ni datos por-hospital que no tenemos.
const CONSEJOS = [
  "Lleva agua y algo ligero para comer — las esperas pueden ser largas.",
  "Guarda los resultados y recetas anteriores en una sola carpeta, por si el médico los pide.",
  "Carga el celular antes de salir: aquí verás cualquier cambio en tiempo real.",
  "Si el trámite tarda, puedes avisar a la familia con el botón de WhatsApp de abajo.",
  "Anota cualquier duda para la próxima consulta — es fácil olvidarla en el momento.",
];

export default async function TarjetaAhoraPage() {
  const sesion = await leerSesionCuidador();
  if (!sesion) redirect("/cuidador");

  const [detalle, cuidadorActual, pacientes, viaje, idioma] = await Promise.all([
    obtenerRutaParaCuidador(sesion.pacienteId),
    obtenerCuidador(sesion.cuidadorId),
    pacientesDeCuidador(sesion.cuidadorId),
    evaluarViaje(sesion.pacienteId),
    leerIdioma(),
  ]);

  // Paciente inexistente (cookie firmada pero obsoleta, ej. tras un reseed):
  // redirige a "/cuidador", que usa sesionCuidadorValida (no solo la firma)
  // para decidir si reenvía aquí — por eso esto no hace un bucle infinito.
  if (!detalle) redirect("/cuidador");
  const { paciente: p, pasos, pasoActual } = detalle;

  const pasoSiguiente = pasoActual
    ? (pasos.find((x) => x.orden > pasoActual.orden && x.estado === "programado") ?? null)
    : null;

  const mostrarAvisoViaje = viaje && viaje.esProvincia && viaje.estado !== "verde";
  const nombreCuidador = cuidadorActual?.nombre.split(" ")[0] ?? "Familia";
  const inicialPaciente = p.nombre.charAt(0).toUpperCase();
  const consejoHoy = CONSEJOS[new Date().getDate() % CONSEJOS.length];

  const mensajeWhatsapp = pasoActual
    ? `Hola, les cuento el avance de ${p.nombre.split(" ")[0]}: ahora está en ${pasoActual.ubicacion?.nombre ?? "el hospital"}${pasoActual.programadoPara ? ` (${formatearCuando(pasoActual.programadoPara)})` : ""}. Les aviso apenas haya novedades.`
    : `Hola, les cuento que ${p.nombre.split(" ")[0]} está al día con su ruta en el hospital por ahora.`;

  return (
    <main className="flex flex-col min-h-full px-5 pt-6">
      <div className="hp-in flex items-start justify-between mb-1">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary flex items-center gap-1">
            <span aria-hidden="true">⬡</span> {t(idioma, "mapa_de_la_ruta")}
          </p>
          <h1 className="font-serif text-xl mt-0.5">{t(idioma, "hola")}, {nombreCuidador}</h1>
        </div>
        {pacientes.length > 1 ? (
          <Link
            href="/cuidador/elegir"
            className="hp-press shrink-0 mt-1 text-sm text-primary underline"
          >
            {t(idioma, "cambiar_hijo")}
          </Link>
        ) : (
          <div className="shrink-0 mt-1">
            <LiveRefresher pacienteId={sesion.pacienteId} mostrarIndicador />
          </div>
        )}
      </div>

      <div className="hp-in-fast flex items-center gap-2.5 mb-6">
        <span
          className="flex items-center justify-center shrink-0 h-8 w-8 rounded-full text-sm font-bold"
          style={{ backgroundColor: "var(--surface-2)", color: "var(--surface-primary)" }}
          aria-hidden="true"
        >
          {inicialPaciente}
        </span>
        <p className="text-sm text-text-muted">
          {t(idioma, "cuidando_a")} <span className="font-semibold text-primary">{p.nombre}</span>
        </p>
      </div>

      {mostrarAvisoViaje && (
        <Link
          href="/cuidador/viaje"
          className="hp-in hp-press mb-5 flex items-center gap-3 rounded-lg border px-4 py-3"
          style={{
            borderColor:
              viaje!.estado === "rojo" ? "var(--status-vencido)" : "var(--status-en-curso)",
            backgroundColor:
              viaje!.estado === "rojo"
                ? "color-mix(in srgb, var(--status-vencido) 8%, transparent)"
                : "color-mix(in srgb, var(--status-en-curso) 8%, transparent)",
          }}
        >
          <span
            className={`text-lg shrink-0 ${viaje!.estado === "rojo" ? "hp-pulse" : ""}`}
            style={{
              color: viaje!.estado === "rojo" ? "var(--status-vencido)" : "var(--status-en-curso)",
            }}
            aria-hidden="true"
          >
            {viaje!.estado === "rojo" ? "▲" : "●"}
          </span>
          <span className="text-sm font-medium">
            {viaje!.estado === "rojo"
              ? "Espera antes de viajar — toca aquí"
              : "Confirma antes de viajar — toca aquí"}
          </span>
        </Link>
      )}

      {!pasoActual ? (
        <div key="vacio" className="hp-in flex flex-col items-center text-center rounded-2xl bg-surface-1 shadow-sm px-6 py-8 mb-5">
          <Mascota estado="celebrando" size={140} className="hp-in-pop mb-2" />
          <h2 className="font-serif text-lg mb-2">{t(idioma, "todo_al_dia_titulo")}</h2>
          <p className="text-sm text-text-muted leading-relaxed max-w-xs">
            {t(idioma, "todo_al_dia_texto")}
          </p>
        </div>
      ) : (
        <div key={pasoActual.id} className="flex flex-col gap-4 mb-2">
          <div
            className="hp-in rounded-2xl shadow-sm px-5 py-5"
            style={{ backgroundColor: "var(--station-current-bg)", color: "var(--station-current-ink)" }}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <p className="text-xs font-bold uppercase tracking-wide opacity-80">
                {t(idioma, "estacion_actual")}
              </p>
              <span className="text-xl shrink-0" aria-hidden="true">
                {ICONO_TIPO[pasoActual.tipo] ?? "●"}
              </span>
            </div>
            <h2 className="font-serif text-lg leading-snug mb-2">
              {t(idioma, "estamos_en")} {pasoActual.ubicacion?.nombre ?? "—"}
            </h2>
            <p className="text-sm leading-relaxed mb-4 opacity-90">
              {pasoActual.instruccionCuidador}
            </p>
            <div className="flex items-center flex-wrap gap-2 mb-4">
              {pasoActual.ubicacion?.piso && (
                <span className="text-xs font-semibold rounded-full bg-white/50 px-3 py-1">
                  {pasoActual.ubicacion.piso}
                  {pasoActual.ubicacion?.modulo ? ` · Módulo ${pasoActual.ubicacion.modulo}` : ""}
                </span>
              )}
              {pasoActual.ubicacion?.ventanilla && (
                <span className="text-xs font-semibold rounded-full bg-white/50 px-3 py-1">
                  {pasoActual.ubicacion.ventanilla}
                </span>
              )}
              {pasoActual.programadoPara && (
                <span className="text-xs font-semibold rounded-full bg-white/70 px-3 py-1">
                  {pasoActual.estado === "vencido" ? "Debiste ir el " : ""}
                  {formatearCuando(pasoActual.programadoPara)}
                </span>
              )}
            </div>
            <Link
              href="/cuidador/escanear"
              className="hp-press w-full min-h-12 flex items-center justify-center rounded-lg bg-black/85 text-white py-3 text-base font-semibold text-center hover:bg-black"
            >
              {t(idioma, "escanear_codigo")}
            </Link>
          </div>

          {pasoSiguiente && (
            <div
              className="hp-in rounded-2xl shadow-sm px-5 py-4"
              style={{ backgroundColor: "var(--station-next-bg)", color: "var(--station-next-ink)", animationDelay: "60ms" }}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="text-xs font-bold uppercase tracking-wide opacity-80">
                  {t(idioma, "sigue_despues")}
                </p>
                <span className="text-xl shrink-0" aria-hidden="true">
                  {ICONO_TIPO[pasoSiguiente.tipo] ?? "●"}
                </span>
              </div>
              <h3 className="font-serif text-base leading-snug mb-1">
                {pasoSiguiente.ubicacion?.nombre ?? "—"}
              </h3>
              <p className="text-sm leading-relaxed opacity-90">
                {pasoSiguiente.instruccionCuidador}
              </p>
            </div>
          )}
        </div>
      )}

      <a
        href={`https://wa.me/?text=${encodeURIComponent(mensajeWhatsapp)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="hp-in hp-press flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 mt-3 mb-5 text-base font-semibold"
        style={{ backgroundColor: "var(--station-share-bg)", color: "var(--station-share-ink)" }}
      >
        <span aria-hidden="true">◐</span> {t(idioma, "compartir_whatsapp")}
      </a>

      {p.esProvincia && (
        <Link
          href="/cuidador/alojamiento"
          className="hp-in-fast rounded-2xl shadow-sm px-5 py-4 mb-5 block"
          style={{ backgroundColor: "var(--station-accent-bg)", color: "var(--station-accent-ink)" }}
        >
          <p className="text-xs font-bold uppercase tracking-wide opacity-80 mb-1">
            {t(idioma, "familia_provincia")}
          </p>
          <h3 className="font-serif text-base mb-1">{t(idioma, "alojamiento_titulo")}</h3>
          <p className="text-sm underline font-medium">{t(idioma, "ver_opciones")}</p>
        </Link>
      )}

      <div className="hp-in-fast flex items-start gap-2.5 px-1 mb-8">
        <span
          className="text-sm shrink-0 mt-0.5"
          style={{ color: "var(--accent-sello)" }}
          aria-hidden="true"
        >
          ⬡
        </span>
        <p className="text-sm text-text-muted leading-relaxed">{consejoHoy}</p>
      </div>
    </main>
  );
}
