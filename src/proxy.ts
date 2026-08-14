import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Next.js 16 renombró `middleware.ts` → `proxy.ts` (export `proxy`, no
 * `middleware`). Corre siempre en runtime Node — no hay edge aquí.
 *
 * Este proxy protege SOLO las rutas de personal (dashboard clínico, bandeja
 * de riesgo, ventanilla, panel de impacto). La app del cuidador (F3) usa un
 * acceso propio, deliberadamente más liviano que una cuenta de staff — ver
 * docs/arquitectura.md §7 ("cuidador sin smartphone" / "sin cuenta que
 * crear"). No la protegemos aquí.
 */
const RUTAS_POR_ROL: Record<string, string[]> = {
  "/clinico": ["medico", "admin"],
  "/riesgo": ["gestor", "medico", "admin"],
  "/ventanilla": ["ventanilla", "admin"],
  "/impacto": ["admin", "gestor", "medico"],
};

export async function proxy(req: NextRequest) {
  const { nextUrl } = req;
  const session = await auth();
  const rol = session?.user?.rol;

  const base = Object.keys(RUTAS_POR_ROL).find((p) => nextUrl.pathname.startsWith(p));
  if (!base) return NextResponse.next();

  if (!session?.user) {
    const url = new URL("/ingresar", nextUrl.origin);
    url.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  const rolesPermitidos = RUTAS_POR_ROL[base];
  if (rol && !rolesPermitidos.includes(rol)) {
    return NextResponse.redirect(new URL("/no-autorizado", nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/clinico/:path*", "/riesgo/:path*", "/ventanilla/:path*", "/impacto/:path*"],
};
