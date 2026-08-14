"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { contacto, evento, alerta } from "@/db/schema";
import { eq } from "drizzle-orm";

type RegistrarContactoInput = {
  alertaId: string;
  canal: string;
  resultado: string;
  nota?: string;
  marcarResuelta?: boolean;
};

/**
 * Registra un intento de recontacto con la familia (llamada, SMS,
 * WhatsApp, presencial). Queda ligado a la alerta que lo motivó — es la
 * traza de que alguien SÍ hizo algo con la bandeja de riesgo, no solo la
 * miró.
 */
export async function registrarContacto(input: RegistrarContactoInput) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado.");

  const ahora = new Date();
  const [nuevo] = await db
    .insert(contacto)
    .values({
      alertaId: input.alertaId,
      usuarioId: session.user.id,
      canal: input.canal,
      resultado: input.resultado,
      nota: input.nota?.trim() || null,
      ocurridoEn: ahora,
    })
    .returning();

  await db.insert(evento).values({
    entidadTipo: "alerta",
    entidadId: input.alertaId,
    tipo: "contacto_registrado",
    actorId: session.user.id,
    actorRol: session.user.rol,
    origen: "web",
    ocurridoEn: ahora,
    payload: { canal: input.canal, resultado: input.resultado },
  });

  if (input.marcarResuelta) {
    await db
      .update(alerta)
      .set({ estado: "resuelta", resueltaEn: ahora })
      .where(eq(alerta.id, input.alertaId));
    await db.insert(evento).values({
      entidadTipo: "alerta",
      entidadId: input.alertaId,
      tipo: "alerta_resuelta",
      actorId: session.user.id,
      actorRol: session.user.rol,
      origen: "web",
      ocurridoEn: ahora,
    });
  } else {
    await db.update(alerta).set({ estado: "en_seguimiento" }).where(eq(alerta.id, input.alertaId));
  }

  revalidatePath("/riesgo");
  return nuevo;
}
