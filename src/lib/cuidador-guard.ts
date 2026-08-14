import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { paciente } from "@/db/schema";
import { leerSesionCuidador } from "@/lib/cuidador-session";

/**
 * Solo lectura, a propósito: Next.js prohíbe escribir cookies durante el
 * render de un Server Component (solo se puede en Server Actions o Route
 * Handlers) — intentar `cerrarSesionCuidador()` desde aquí revienta con
 * "Cookies can only be modified in a Server Action or Route Handler".
 *
 * Una cookie con firma HMAC válida no prueba que la sesión siga siendo
 * válida: si el paciente referenciado ya no existe (ej. el contenedor se
 * reinició y volvió a sembrar datos sintéticos con UUIDs nuevos), la firma
 * sigue siendo correcta pero el dato ya no existe. Por eso SOLO
 * "/cuidador/page.tsx" usa esto para decidir si redirige a "/ahora" — si
 * decide que no, simplemente muestra el formulario de entrada de nuevo, y
 * la cookie vieja se sobreescribe sola en el próximo `ingresarComoCuidador`
 * (un Server Action, donde sí se puede escribir cookies). Nunca hace falta
 * borrarla explícitamente.
 */
export async function sesionCuidadorValida() {
  const sesion = await leerSesionCuidador();
  if (!sesion) return null;

  const [existe] = await db
    .select({ id: paciente.id })
    .from(paciente)
    .where(eq(paciente.id, sesion.pacienteId))
    .limit(1);

  return existe ? sesion : null;
}
