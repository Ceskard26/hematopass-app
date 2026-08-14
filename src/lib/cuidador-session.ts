import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Sesión del cuidador: deliberadamente NO es una cuenta Auth.js. La familia
 * entra con el código de su paciente — "sin cuenta que crear" (ver
 * docs/arquitectura.md §7). La cookie guarda ids opacos (UUID), nunca datos
 * clínicos, y va firmada con HMAC reutilizando AUTH_SECRET (no se agrega un
 * segundo secreto solo para esto).
 */

const COOKIE_CUIDADOR = "hp_cuidador";
const COOKIE_PACIENTE = "hp_paciente";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 días — el tratamiento dura meses

function firmar(valor: string): string {
  const firma = createHmac("sha256", process.env.AUTH_SECRET!).update(valor).digest("hex");
  return `${valor}.${firma}`;
}

function verificar(cookieValue: string): string | null {
  const idx = cookieValue.lastIndexOf(".");
  if (idx === -1) return null;
  const valor = cookieValue.slice(0, idx);
  const firmaRecibida = cookieValue.slice(idx + 1);
  const firmaEsperada = createHmac("sha256", process.env.AUTH_SECRET!).update(valor).digest("hex");
  const a = Buffer.from(firmaRecibida);
  const b = Buffer.from(firmaEsperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return valor;
}

export async function crearSesionCuidador(cuidadorId: string, pacienteId: string) {
  const store = await cookies();
  const opts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE,
    path: "/",
  };
  store.set(COOKIE_CUIDADOR, firmar(cuidadorId), opts);
  store.set(COOKIE_PACIENTE, firmar(pacienteId), opts);
}

export async function seleccionarPacienteActivo(pacienteId: string) {
  const store = await cookies();
  store.set(COOKIE_PACIENTE, firmar(pacienteId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function leerSesionCuidador(): Promise<
  { cuidadorId: string; pacienteId: string } | null
> {
  const store = await cookies();
  const cuidadorRaw = store.get(COOKIE_CUIDADOR)?.value;
  const pacienteRaw = store.get(COOKIE_PACIENTE)?.value;
  if (!cuidadorRaw || !pacienteRaw) return null;

  const cuidadorId = verificar(cuidadorRaw);
  const pacienteId = verificar(pacienteRaw);
  if (!cuidadorId || !pacienteId) return null;

  return { cuidadorId, pacienteId };
}

export async function cerrarSesionCuidador() {
  const store = await cookies();
  store.delete(COOKIE_CUIDADOR);
  store.delete(COOKIE_PACIENTE);
}
