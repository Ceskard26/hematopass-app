"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { paso, evento, ubicacion } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  crearSesionCuidador,
  seleccionarPacienteActivo,
  leerSesionCuidador,
  cerrarSesionCuidador,
} from "@/lib/cuidador-session";
import {
  buscarPacientePorCodigoYCuidador,
  pacienteEsDeCuidador,
  obtenerPasoPorUbicacionPendiente,
} from "@/lib/queries-cuidador";
import { notificarPaciente } from "@/lib/realtime";

/**
 * Entrada del cuidador: el código del paciente (impreso en su tarjeta física
 * — el "pasaporte") es todo lo que hace falta. Sin cuenta, sin contraseña.
 * Ver docs/arquitectura.md §7.
 */
export async function ingresarComoCuidador(formData: FormData) {
  const codigo = String(formData.get("codigo") ?? "").trim();
  if (!codigo) redirect("/cuidador?error=vacio");

  const p = await buscarPacientePorCodigoYCuidador(codigo);
  if (!p || p.cuidadores.length === 0) {
    // Confusión real y observada: el QR de una ventanilla (ubicacion.qrToken,
    // impreso desde /clinico/ubicaciones) se escanea aquí por error en vez
    // de en /cuidador/escanear. "No encontramos ese código" no explica el
    // porqué — se detecta el caso específico para dar la instrucción correcta.
    const [esVentanilla] = await db
      .select({ id: ubicacion.id })
      .from(ubicacion)
      .where(eq(ubicacion.qrToken, codigo.trim()))
      .limit(1);
    redirect(esVentanilla ? "/cuidador?error=es_ventanilla" : "/cuidador?error=no_encontrado");
  }

  const principal = p.cuidadores.find((c) => c.esPrincipal) ?? p.cuidadores[0];
  await crearSesionCuidador(principal.cuidadorId, p.id);
  redirect("/cuidador/ahora");
}

export async function cambiarPacienteActivo(pacienteId: string) {
  const sesion = await leerSesionCuidador();
  if (!sesion) redirect("/cuidador");

  const pertenece = await pacienteEsDeCuidador(sesion.cuidadorId, pacienteId);
  if (!pertenece) throw new Error("Este paciente no corresponde a tu sesión.");

  await seleccionarPacienteActivo(pacienteId);
  redirect("/cuidador/ahora");
}

export async function salirComoCuidador() {
  await cerrarSesionCuidador();
  redirect("/cuidador");
}

type ResultadoEscaneo =
  | { ok: true; pasoId: string; tipo: string; tituloClinico: string; ubicacionNombre: string }
  | { ok: false; motivo: string };

/**
 * Beat 3 de la demo: el padre escanea el QR estático de la ventanilla. La
 * seguridad no está en el QR (es un sticker impreso, sin lógica) sino en el
 * servidor: se valida que ESE paciente tenga UN paso pendiente para ESA
 * ubicación. Escanear el QR de Farmacia sin tener nada pendiente ahí no
 * hace nada. Ver docs/arquitectura.md §7.
 */
export async function validarEscaneo(qrToken: string): Promise<ResultadoEscaneo> {
  const sesion = await leerSesionCuidador();
  if (!sesion) return { ok: false, motivo: "Tu sesión expiró. Vuelve a ingresar." };

  const [ubi] = await db.select().from(ubicacion).where(eq(ubicacion.qrToken, qrToken)).limit(1);
  if (!ubi) return { ok: false, motivo: "Este código no es válido." };

  const pasoPendiente = await obtenerPasoPorUbicacionPendiente(sesion.pacienteId, ubi.id);
  if (!pasoPendiente) {
    return {
      ok: false,
      motivo: `No tienes ningún paso pendiente en ${ubi.nombre} en este momento.`,
    };
  }

  const ahora = new Date();
  await db
    .update(paso)
    .set({ estado: "completado", completadoEn: ahora })
    .where(eq(paso.id, pasoPendiente.id));

  await db.insert(evento).values([
    {
      entidadTipo: "paso",
      entidadId: pasoPendiente.id,
      tipo: "qr_escaneado",
      actorRol: "cuidador",
      origen: "qr",
      ocurridoEn: ahora,
      payload: { ubicacionId: ubi.id },
    },
    {
      entidadTipo: "paso",
      entidadId: pasoPendiente.id,
      tipo: "paso_completado",
      actorRol: "cuidador",
      origen: "qr",
      ocurridoEn: ahora,
    },
  ]);

  await notificarPaciente(sesion.pacienteId);

  return {
    ok: true,
    pasoId: pasoPendiente.id,
    tipo: pasoPendiente.tipo,
    tituloClinico: pasoPendiente.tituloClinico,
    ubicacionNombre: ubi.nombre,
  };
}
