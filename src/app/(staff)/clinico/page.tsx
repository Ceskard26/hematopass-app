import Link from "next/link";
import { listarPacientesClinico } from "@/lib/queries";
import { EstadoBadge, type EstadoPaso } from "@/components/estado-badge";
import { PLANTILLAS_PASO } from "@/lib/plantillas-paso";

export default async function ClinicoPage() {
  const pacientes = await listarPacientesClinico();

  return (
    <main className="p-8 max-w-[1200px]">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-lg">Pacientes</h1>
          <p className="text-sm text-text-muted">
            {pacientes.length} en seguimiento activo · datos sintéticos
          </p>
        </div>
        <div className="flex gap-4">
          <Link href="/clinico/tarjetas" className="text-sm text-text-muted hover:text-text underline">
            Tarjetas de paciente
          </Link>
          <Link href="/clinico/ubicaciones" className="text-sm text-text-muted hover:text-text underline">
            Códigos QR de ventanillas
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface-1 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2 text-left text-xs text-text-muted uppercase tracking-wide">
              <th className="px-4 py-3 font-medium">Paciente</th>
              <th className="px-4 py-3 font-medium">Diagnóstico</th>
              <th className="px-4 py-3 font-medium">Procedencia</th>
              <th className="px-4 py-3 font-medium">Paso actual</th>
              <th className="px-4 py-3 font-medium text-right">Pendientes</th>
            </tr>
          </thead>
          <tbody>
            {pacientes.map((p) => (
              <tr
                key={p.id}
                className="border-b border-border last:border-0 hover:bg-surface-2/60 transition-colors"
              >
                <td className="px-4 py-3">
                  <Link href={`/clinico/${p.codigo}`} className="hover:underline">
                    <span className="font-medium">{p.nombre}</span>
                  </Link>
                  <p className="text-xs text-text-muted">{p.codigo}</p>
                </td>
                <td className="px-4 py-3 text-text-muted">{p.dxNombre}</td>
                <td className="px-4 py-3">
                  {p.esProvincia ? (
                    <span className="inline-flex items-center gap-1 text-xs">
                      <span aria-hidden="true">✈</span> {p.departamento}
                    </span>
                  ) : (
                    <span className="text-xs text-text-muted">Lima</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {p.pasoActualTipo ? (
                    <span className="text-text-muted">
                      {PLANTILLAS_PASO[p.pasoActualTipo]?.etiqueta ?? p.pasoActualTitulo}
                    </span>
                  ) : p.rutaId ? (
                    <span className="text-text-muted italic">Al día — sin paso pendiente</span>
                  ) : (
                    <span className="text-text-muted italic">Sin ruta activa</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {p.vencidos > 0 ? (
                    <EstadoBadge estado={"vencido" as EstadoPaso} />
                  ) : p.pendientes > 0 ? (
                    <span className="text-xs text-text-muted">{p.pendientes} paso(s)</span>
                  ) : (
                    <span className="text-xs text-text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
