"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { paso, evento, ruta } from "@/db/schema";
import { siguienteOrden } from "@/lib/queries";
import { PLANTILLAS_PASO } from "@/lib/plantillas-paso";
import { notificarPaciente } from "@/lib/realtime";

type CrearPasoInput = {
  pacienteCodigo: string;
  rutaId: string;
  tipo: keyof typeof PLANTILLAS_PASO;
  ubicacionId: string;
  tituloClinico?: string;
  instruccionCuidador?: string;
  programadoPara?: string; // datetime-local value
  venceEn?: string;
};

/**
 * Genera el siguiente paso de la ruta. Beat 1 de la demo: "el doctor
 * selecciona en un menú desplegable el siguiente paso" — 2 clics, sin
 * escribir. El paso nace en estado "notificado" (no "programado") porque
 * el punto del producto es que el cuidador lo vea de inmediato — beat 2:
 * "el celular se ilumina al instante", vía notificarPaciente() al final.
 */
export async function crearPaso(input: CrearPasoInput) {
  const session = await auth();
  const rol = session?.user?.rol;
  if (!session?.user || (rol !== "medico" && rol !== "admin")) {
    throw new Error("No autorizado para generar pasos.");
  }

  const [rutaRow] = await db
    .select({ pacienteId: ruta.pacienteId })
    .from(ruta)
    .where(eq(ruta.id, input.rutaId))
    .limit(1);
  if (!rutaRow) throw new Error("Ruta no encontrada.");

  const plantilla = PLANTILLAS_PASO[input.tipo];
  const orden = await siguienteOrden(input.rutaId);
  const ahora = new Date();

  const [nuevoPaso] = await db
    .insert(paso)
    .values({
      rutaId: input.rutaId,
      orden,
      tipo: input.tipo,
      ubicacionId: input.ubicacionId,
      tituloClinico: input.tituloClinico?.trim() || plantilla.tituloClinico,
      instruccionCuidador: input.instruccionCuidador?.trim() || plantilla.instruccionCuidador,
      estado: "notificado",
      programadoPara: input.programadoPara ? new Date(input.programadoPara) : ahora,
      venceEn: input.venceEn ? new Date(input.venceEn) : undefined,
      creadoPor: session.user.id,
    })
    .returning();

  await db.insert(evento).values([
    {
      entidadTipo: "paso",
      entidadId: nuevoPaso.id,
      tipo: "paso_creado",
      actorId: session.user.id,
      actorRol: rol,
      origen: "web",
      ocurridoEn: ahora,
    },
    {
      entidadTipo: "paso",
      entidadId: nuevoPaso.id,
      tipo: "paso_notificado",
      actorId: session.user.id,
      actorRol: rol,
      origen: "web",
      ocurridoEn: ahora,
      payload: { destino: plantilla.etiqueta },
    },
  ]);

  revalidatePath("/clinico");
  revalidatePath(`/clinico/${input.pacienteCodigo}`);
  await notificarPaciente(rutaRow.pacienteId);

  return nuevoPaso;
}

/**
 * Nota libre del médico sobre un paso — indicación, conclusión de la
 * consulta, diagnóstico. Visible para el cuidador en su pasaporte. Decisión
 * de producto explícita del usuario (ver comentario en src/db/schema.ts
 * sobre paso.notaMedica).
 */
export async function actualizarNotaPaso(input: {
  pasoId: string;
  pacienteCodigo: string;
  nota: string;
}) {
  const session = await auth();
  const rol = session?.user?.rol;
  if (!session?.user || (rol !== "medico" && rol !== "admin")) {
    throw new Error("No autorizado para escribir notas clínicas.");
  }

  const notaLimpia = input.nota.trim() || null;

  const [pasoRow] = await db
    .select({ rutaId: paso.rutaId })
    .from(paso)
    .where(eq(paso.id, input.pasoId))
    .limit(1);
  if (!pasoRow) throw new Error("Paso no encontrado.");

  await db.update(paso).set({ notaMedica: notaLimpia }).where(eq(paso.id, input.pasoId));

  const [rutaRow] = await db
    .select({ pacienteId: ruta.pacienteId })
    .from(ruta)
    .where(eq(ruta.id, pasoRow.rutaId))
    .limit(1);

  await db.insert(evento).values({
    entidadTipo: "paso",
    entidadId: input.pasoId,
    tipo: "paso_nota_actualizada",
    actorId: session.user.id,
    actorRol: rol,
    origen: "web",
  });

  revalidatePath(`/clinico/${input.pacienteCodigo}`);
  if (rutaRow) await notificarPaciente(rutaRow.pacienteId);
}
