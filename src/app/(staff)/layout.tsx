import { auth, signOut } from "@/lib/auth";
import { NavClinico } from "@/components/nav-clinico";

const NAV = [
  { href: "/clinico", label: "Pacientes", roles: ["medico", "admin"] },
  { href: "/riesgo", label: "Bandeja de riesgo", roles: ["gestor", "medico", "admin"] },
  { href: "/ventanilla", label: "Ventanilla", roles: ["ventanilla", "admin"] },
  { href: "/impacto", label: "Impacto", roles: ["admin", "gestor", "medico"] },
] as const;

const ROL_LABEL: Record<string, string> = {
  medico: "Médico",
  gestor: "Gestor de casos",
  ventanilla: "Ventanilla",
  admin: "Administrador",
};

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const rol = session?.user?.rol ?? "";
  const items = NAV.filter((item) => item.roles.includes(rol as never));

  return (
    <div className="min-h-full flex">
      <aside className="w-56 shrink-0 border-r border-border bg-surface-1 flex flex-col">
        <div className="px-5 py-5 border-b border-border flex items-center gap-2.5">
          <img
            src="/brand-mark.png"
            alt=""
            aria-hidden="true"
            width={32}
            height={32}
            className="hp-in-pop h-8 w-8 rounded-full shrink-0"
          />
          <div>
            <p className="font-serif text-md leading-tight">Hematopass</p>
            <p className="text-xs text-text-muted mt-0.5">Personal clínico</p>
          </div>
        </div>
        <NavClinico items={items.map((i) => ({ href: i.href, label: i.label }))} />
        <div className="px-5 py-4 border-t border-border">
          <p className="text-sm font-medium truncate">{session?.user?.name}</p>
          <p className="text-xs text-text-muted mb-3">{ROL_LABEL[rol] ?? rol}</p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button className="hp-press text-xs text-text-muted hover:text-text underline">
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
