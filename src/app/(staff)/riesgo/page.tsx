import Link from "next/link";
import { sincronizarAlertas } from "@/lib/risk-engine";
import { listarAlertasActivas } from "@/lib/queries-riesgo";
import { RegistrarContactoForm } from "@/components/registrar-contacto-form";
import { DescartarAlertaButton } from "@/components/descartar-alerta-button";

const SEVERIDAD_CFG: Record<string, { label: string; color: string; simbolo: string }> = {
  critica: { label: "Crítica", color: "var(--status-abandono)", simbolo: "▲▲" },
  alta: { label: "Alta", color: "var(--status-vencido)", simbolo: "▲" },
  media: { label: "Media", color: "var(--status-en-curso)", simbolo: "●" },
};

const CANAL_LABEL: Record<string, string> = {
  llamada: "Llamada",
  sms: "SMS",
  whatsapp: "WhatsApp",
  presencial: "Presencial",
};

const RESULTADO_LABEL: Record<string, string> = {
  contactado: "se logró contactar",
  no_respondio: "no respondió",
  numero_invalido: "número inválido",
};

function formatearFecha(fecha: Date | string) {
  return new Date(fecha).toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function RiesgoPage() {
  await sincronizarAlertas();
  const alertas = await listarAlertasActivas();

  return (
    <main className="p-8 max-w-[900px]">
      <h1 className="font-serif text-lg mb-1">Bandeja de riesgo</h1>
      <p className="text-sm text-text-muted mb-8">
        {alertas.length} paciente{alertas.length === 1 ? "" : "s"} en riesgo · evaluado con
        cada carga, motivo explícito por regla
      </p>

      {alertas.length === 0 ? (
        <p className="text-sm text-text-muted italic">
          Ningún paciente activo cumple hoy las reglas de riesgo. Buena señal.
        </p>
      ) : (
        <div className="space-y-3">
          {alertas.map((a, i) => {
            const cfg = SEVERIDAD_CFG[a.severidad];
            return (
              <div
                key={a.id}
                className="hp-in rounded-lg border border-border bg-surface-1 p-4"
                style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium ${a.severidad === "critica" ? "hp-pulse" : ""}`}
                    style={{ color: cfg.color }}
                  >
                    <span aria-hidden="true">{cfg.simbolo}</span>
                    {cfg.label}
                  </span>
                  <Link
                    href={`/clinico/${a.paciente.codigo}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {a.paciente.nombre}
                  </Link>
                  {a.paciente.esProvincia && (
                    <span className="text-xs text-text-muted">✈ {a.paciente.departamento}</span>
                  )}
                </div>
                <p className="text-sm mb-1">{a.motivoTexto}</p>

                {a.contactos.length > 0 && (
                  <ul className="mb-2 space-y-0.5">
                    {a.contactos.map((c) => (
                      <li key={c.id} className="text-xs text-text-muted">
                        {formatearFecha(c.ocurridoEn)} · {CANAL_LABEL[c.canal] ?? c.canal} ·{" "}
                        {RESULTADO_LABEL[c.resultado] ?? c.resultado}
                        {c.usuario ? ` · ${c.usuario.nombre}` : ""}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex items-center gap-4">
                  <RegistrarContactoForm alertaId={a.id} />
                  <DescartarAlertaButton alertaId={a.id} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
