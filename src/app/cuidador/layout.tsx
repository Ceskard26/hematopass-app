import { leerSesionCuidador } from "@/lib/cuidador-session";
import { leerIdioma } from "@/lib/idioma-cuidador";
import { ServiceWorkerRegistro } from "@/components/service-worker-registro";
import { SincronizadorOffline } from "@/components/sincronizador-offline";
import { NavCuidador } from "@/components/nav-cuidador";
import { IdiomaToggle } from "@/components/idioma-toggle";

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
  const [sesion, idioma] = await Promise.all([leerSesionCuidador(), leerIdioma()]);

  return (
    <div data-surface="caregiver" className="min-h-full flex flex-col bg-bg">
      <ServiceWorkerRegistro />
      <SincronizadorOffline />
      <div className="flex justify-end px-5 pt-3">
        <IdiomaToggle idioma={idioma} />
      </div>
      <div className="flex-1 pb-20">{children}</div>

      {sesion && <NavCuidador idioma={idioma} />}
    </div>
  );
}
