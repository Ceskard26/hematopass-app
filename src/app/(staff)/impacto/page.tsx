import { obtenerMetricasImpacto } from "@/lib/queries-impacto";

function StatTile({
  etiqueta,
  valor,
  detalle,
  color,
  delay = 0,
}: {
  etiqueta: string;
  valor: string;
  detalle?: string;
  color?: string;
  delay?: number;
}) {
  return (
    <div
      className="hp-in-scale hp-press rounded-lg border border-border bg-surface-1 p-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="text-xs text-text-muted uppercase tracking-wide mb-2">{etiqueta}</p>
      <p className="font-serif text-xl" style={color ? { color } : undefined}>
        {valor}
      </p>
      {detalle && <p className="text-xs text-text-muted mt-1">{detalle}</p>}
    </div>
  );
}

/**
 * Barra apilada horizontal, SVG propio — sin librería de gráficos (regla
 * dura del proyecto: nada de dashboard genérico). Cada segmento lleva
 * etiqueta de texto, no solo color, para no depender del color para
 * comunicar (docs/sistema-de-diseno.md §5).
 */
function BarraEstados({
  completados,
  pendientes,
  vencidos,
  noAsistio,
  total,
}: {
  completados: number;
  pendientes: number;
  vencidos: number;
  noAsistio: number;
  total: number;
}) {
  if (total === 0) return <p className="text-sm text-text-muted italic">Sin pasos registrados aún.</p>;

  const segmentos = [
    { valor: completados, color: "var(--status-completado)", etiqueta: "Completados" },
    { valor: pendientes, color: "var(--status-notificado)", etiqueta: "Pendientes" },
    { valor: vencidos, color: "var(--status-vencido)", etiqueta: "Vencidos" },
    { valor: noAsistio, color: "var(--status-abandono)", etiqueta: "No asistió" },
  ].filter((s) => s.valor > 0);

  let acumulado = 0;

  return (
    <div>
      <svg viewBox="0 0 100 8" className="w-full h-6" role="img" aria-label="Distribución de pasos por estado">
        {segmentos.map((s, i) => {
          const ancho = (s.valor / total) * 100;
          const x = acumulado;
          acumulado += ancho;
          return (
            <rect
              key={s.etiqueta}
              className="hp-grow-x"
              x={x}
              y={0}
              width={ancho}
              height={8}
              fill={s.color}
              style={{ animationDelay: `${i * 90}ms` }}
            />
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3">
        {segmentos.map((s) => (
          <span key={s.etiqueta} className="inline-flex items-center gap-1.5 text-xs text-text-muted">
            <span
              className="h-2.5 w-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: s.color }}
              aria-hidden="true"
            />
            {s.etiqueta} · {s.valor} ({Math.round((s.valor / total) * 100)}%)
          </span>
        ))}
      </div>
    </div>
  );
}

export default async function ImpactoPage() {
  const m = await obtenerMetricasImpacto();

  return (
    <main className="p-8 max-w-[1000px]">
      <h1 className="font-serif text-lg mb-1">Panel de impacto</h1>
      <p className="text-sm text-text-muted mb-8">
        Calculado en vivo desde la bitácora de eventos · {m.totalPacientes} pacientes sintéticos
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatTile
          etiqueta="Tasa de abandono"
          valor={`${m.tasaAbandono.toFixed(1)}%`}
          detalle={`${m.enAbandono} de ${m.totalConRuta} pacientes`}
          color={m.tasaAbandono > 0 ? "var(--status-abandono)" : undefined}
          delay={0}
        />
        <StatTile
          etiqueta="Viajes desperdiciados evitados"
          valor={String(m.viajesEvitados)}
          detalle={
            m.viajesEnRiesgoAhora > 0
              ? `${m.viajesEnRiesgoAhora} en riesgo ahora mismo`
              : "Regla R5 — la única preventiva"
          }
          color="var(--color-sello-dark)"
          delay={60}
        />
        <StatTile
          etiqueta="Pasos vencidos"
          valor={String(m.pasos.vencidos)}
          detalle={`de ${m.pasos.total} pasos totales`}
          color={m.pasos.vencidos > 0 ? "var(--status-vencido)" : undefined}
          delay={120}
        />
        <StatTile
          etiqueta="Recontactos exitosos"
          valor={`${m.contactos.exitosos} / ${m.contactos.total}`}
          detalle="familias localizadas tras una alerta"
          delay={180}
        />
      </div>

      <section className="mb-10">
        <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3">
          Estado de los pasos
        </h2>
        <BarraEstados
          completados={m.pasos.completados}
          pendientes={m.pasos.pendientes}
          vencidos={m.pasos.vencidos}
          noAsistio={m.pasos.noAsistio}
          total={m.pasos.total}
        />
      </section>

      <section className="grid grid-cols-2 gap-4">
        <div className="hp-in-scale rounded-lg border border-border bg-surface-1 p-5">
          <p className="text-xs text-text-muted uppercase tracking-wide mb-2">
            Pacientes de fuera de Lima
          </p>
          <p className="font-serif text-lg">{m.porcentajeProvincia.toFixed(0)}%</p>
          <p className="text-xs text-text-muted mt-1">
            Bloque 1 de investigación: 54% de los pacientes hospitalizados del INSNSB vienen de
            provincia — la razón de que R5 exista.
          </p>
        </div>
        <div className="hp-in-scale rounded-lg border border-border bg-surface-1 p-5" style={{ animationDelay: "60ms" }}>
          <p className="text-xs text-text-muted uppercase tracking-wide mb-2">
            Tiempo promedio entre pasos
          </p>
          <p className="font-serif text-lg">
            {m.diasPromedioEntrePasos !== null ? `${m.diasPromedioEntrePasos.toFixed(1)} días` : "—"}
          </p>
          <p className="text-xs text-text-muted mt-1">
            Calculado entre pasos consecutivos completados de la misma ruta.
          </p>
        </div>
      </section>
    </main>
  );
}
