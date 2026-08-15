import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { leerSesionCuidador } from "@/lib/cuidador-session";
import { obtenerRutaParaCuidador } from "@/lib/queries-cuidador";
import { Mascota } from "@/components/mascota";
import { Sello } from "@/components/sello";

function formatearFecha(fecha: Date | string | null) {
  if (!fecha) return null;
  return new Date(fecha).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/**
 * P11 del rediseño de la app del cuidador: "qué se hizo, próxima fecha,
 * indicaciones". No es un dato nuevo — compone lo que ya existía
 * (paso.notaMedica, instruccionCuidador, y el próximo paso pendiente de la
 * misma ruta) en una sola pantalla, en vez de dejarlo repartido en el
 * timeline de "Mi pasaporte".
 */
export default async function ResumenPasoPage(props: PageProps<"/cuidador/resumen/[pasoId]">) {
  const { pasoId } = await props.params;
  const sesion = await leerSesionCuidador();
  if (!sesion) redirect("/cuidador");

  const detalle = await obtenerRutaParaCuidador(sesion.pacienteId);
  if (!detalle) redirect("/cuidador");

  const paso = detalle.pasos.find((p) => p.id === pasoId);
  if (!paso) notFound();

  const siguiente = detalle.pasos.find(
    (p) => p.orden > paso.orden && (p.estado === "notificado" || p.estado === "programado" || p.estado === "en_curso")
  );

  return (
    <main className="px-6 pt-8 pb-10 min-h-full">
      <Link href="/cuidador/pasaporte" className="text-sm text-primary underline">
        ← Mi pasaporte
      </Link>

      <div className="hp-in text-center mt-6 mb-8">
        <Sello
          estado="sellado"
          tipo={paso.tipo}
          ubicacion={paso.ubicacion?.nombre}
          semilla={paso.id}
          size={72}
        />
        <h1 className="font-serif text-lg mt-3">{paso.instruccionCuidador}</h1>
        <p className="text-sm text-text-muted mt-1">
          {paso.ubicacion?.nombre}
          {paso.completadoEn ? ` · ${formatearFecha(paso.completadoEn)}` : ""}
        </p>
      </div>

      {paso.notaMedica && (
        <section className="hp-in-fast mb-8 rounded-lg border border-border bg-surface-1 px-5 py-4">
          <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-2">
            Qué te dijo el equipo
          </h2>
          <p className="text-base leading-relaxed">{paso.notaMedica}</p>
        </section>
      )}

      {siguiente ? (
        <section className="hp-in-fast rounded-lg px-5 py-5 text-center" style={{ backgroundColor: "var(--surface-2)" }}>
          <Mascota estado="animando" size={64} className="mx-auto mb-3" />
          <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-1">
            Tu próximo paso
          </h2>
          <p className="text-lg font-semibold mb-1">{siguiente.ubicacion?.nombre ?? "—"}</p>
          {siguiente.programadoPara && (
            <p className="text-sm text-text-muted mb-2">{formatearFecha(siguiente.programadoPara)}</p>
          )}
          <p className="text-base text-text-muted leading-relaxed">{siguiente.instruccionCuidador}</p>
        </section>
      ) : (
        <section className="hp-in-fast text-center px-5 py-6">
          <Mascota estado="celebrando" size={72} className="mx-auto mb-3" />
          <p className="text-base text-text-muted">
            Por ahora no hay más pasos pendientes en esta ruta.
          </p>
        </section>
      )}
    </main>
  );
}
