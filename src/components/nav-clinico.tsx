"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Igual que en la superficie del cuidador, no había ninguna señal de "en
 * qué sección estoy" — todos los ítems se veían iguales sin importar la
 * página activa. Acá el indicador es un borde izquierdo (encaja mejor con
 * un layout vertical que el subrayado que usa la barra del cuidador).
 */
export function NavClinico({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 py-3">
      {items.map((item, i) => {
        const activo = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="hp-in hp-press relative block px-5 py-2.5 text-sm hover:bg-surface-2"
            style={{
              animationDelay: `${i * 40}ms`,
              color: activo ? "var(--surface-primary)" : "var(--surface-text)",
              backgroundColor: activo ? "var(--surface-2)" : undefined,
              fontWeight: activo ? 600 : 400,
            }}
          >
            {activo && (
              <span
                className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full"
                style={{ backgroundColor: "var(--surface-primary)" }}
                aria-hidden="true"
              />
            )}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
