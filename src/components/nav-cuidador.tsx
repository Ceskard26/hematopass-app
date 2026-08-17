"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { t, type ClaveTexto } from "@/lib/i18n-cuidador";
import type { Idioma } from "@/lib/idioma-cuidador";

const ITEMS = [
  { href: "/cuidador/ahora", icono: "●", clave: "nav_ahora" as ClaveTexto },
  { href: "/cuidador/pasaporte", icono: "⬡", clave: "nav_mapa" as ClaveTexto },
  { href: "/cuidador/escanear", icono: "▣", clave: "nav_escanear" as ClaveTexto },
] as const;

/**
 * Antes no había ninguna señal de "dónde estoy" en la barra inferior — los
 * 3 destinos se veían idénticos sin importar la pantalla activa. El
 * indicador desliza con transform (barato, no repinta layout) hacia la
 * posición del ítem activo por índice, sin medir el DOM.
 */
export function NavCuidador({ idioma }: { idioma: Idioma }) {
  const pathname = usePathname();
  const activo = ITEMS.findIndex((item) => pathname.startsWith(item.href));

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-surface-1 border-t border-border">
      <div className="relative flex">
        {activo >= 0 && (
          <span
            className="absolute top-0 h-0.5 w-1/3 bg-primary transition-transform duration-300 ease-out"
            style={{ transform: `translateX(${activo * 100}%)` }}
            aria-hidden="true"
          />
        )}
        {ITEMS.map((item) => {
          const esActivo = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="hp-press flex-1 flex flex-col items-center justify-center py-3 gap-0.5 hover:bg-surface-2"
              style={{ color: esActivo ? "var(--surface-primary)" : "var(--surface-text)" }}
            >
              <span className="text-xl transition-transform" style={esActivo ? { transform: "scale(1.12)" } : undefined} aria-hidden="true">
                {item.icono}
              </span>
              <span className="text-xs font-medium">{t(idioma, item.clave)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
