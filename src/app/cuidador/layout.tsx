import Link from "next/link";
import { leerSesionCuidador } from "@/lib/cuidador-session";
import { ServiceWorkerRegistro } from "@/components/service-worker-registro";
import { SincronizadorOffline } from "@/components/sincronizador-offline";

/**
 * Registro visual del cuidador: data-surface="caregiver" activa la paleta
 * "earth" y la escala tipográfica amplia (ver src/app/globals.css). Mismo
 * sistema de tokens que el dashboard clínico, personalidad distinta.
 *
 * Navegación: máximo 3 destinos, siempre visibles, sin menú hamburguesa
 * (docs/sistema-de-diseno.md §7) — la familia no debe tener que aprender
 * a usar un menú en el peor momento de su semana.
 */
export default async function CuidadorLayout({ children }: { children: React.ReactNode }) {
  const sesion = await leerSesionCuidador();

  return (
    <div data-surface="caregiver" className="min-h-full flex flex-col bg-bg">
      <ServiceWorkerRegistro />
      <SincronizadorOffline />
      <div className="flex-1 pb-20">{children}</div>

      {sesion && (
        <nav className="fixed bottom-0 inset-x-0 bg-surface-1 border-t border-border flex">
          <Link
            href="/cuidador/ahora"
            className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-text hover:bg-surface-2 transition-colors"
          >
            <span className="text-xl" aria-hidden="true">
              ●
            </span>
            <span className="text-xs font-medium">Ahora</span>
          </Link>
          <Link
            href="/cuidador/pasaporte"
            className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-text hover:bg-surface-2 transition-colors"
          >
            <span className="text-xl" aria-hidden="true">
              ⬡
            </span>
            <span className="text-xs font-medium">Pasaporte</span>
          </Link>
          <Link
            href="/cuidador/escanear"
            className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-text hover:bg-surface-2 transition-colors"
          >
            <span className="text-xl" aria-hidden="true">
              ▣
            </span>
            <span className="text-xs font-medium">Escanear</span>
          </Link>
        </nav>
      )}
    </div>
  );
}
