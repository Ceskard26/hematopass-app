import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { leerSesionCuidador } from "@/lib/cuidador-session";
import { pacienteEsDeCuidador } from "@/lib/queries-cuidador";
import { suscribirPaciente } from "@/lib/realtime";

/**
 * SSE, no WebSockets: es unidireccional (servidor → cliente) y eso es
 * exactamente lo que necesitamos — el celular del cuidador nunca necesita
 * enviar nada por este canal (docs/arquitectura.md §3). Un solo endpoint
 * sirve a las dos superficies: el personal puede ver cualquier paciente: la
 * familia solo el suyo, verificado contra `pacienteEsDeCuidador` en cada
 * conexión — la cookie de sesión nunca es, por sí sola, prueba suficiente.
 */
export async function GET(req: NextRequest) {
  const pacienteId = req.nextUrl.searchParams.get("pacienteId");
  if (!pacienteId) {
    return new Response("Falta pacienteId", { status: 400 });
  }

  const [staffSesion, cuidadorSesion] = await Promise.all([auth(), leerSesionCuidador()]);

  let autorizado = !!staffSesion?.user;
  if (!autorizado && cuidadorSesion) {
    autorizado = await pacienteEsDeCuidador(cuidadorSesion.cuidadorId, pacienteId);
  }
  if (!autorizado) {
    return new Response("No autorizado", { status: 403 });
  }

  const encoder = new TextEncoder();
  let cerrado = false;

  const stream = new ReadableStream({
    async start(controller) {
      const enviar = (evento: string, data: string) => {
        if (cerrado) return;
        try {
          controller.enqueue(encoder.encode(`event: ${evento}\ndata: ${data}\n\n`));
        } catch {
          // el controller ya cerró (cliente se desconectó a mitad de un enqueue)
        }
      };

      enviar("conectado", "ok");

      // Late de conexión (keep-alive): mantiene vivos los proxies
      // intermedios y sirve como señal de vida para el indicador "en vivo".
      const latido = setInterval(() => enviar("ping", String(Date.now())), 25000);

      const suscripcion = await suscribirPaciente(pacienteId, () => {
        enviar("actualizacion", String(Date.now()));
      });

      const cerrar = () => {
        if (cerrado) return;
        cerrado = true;
        clearInterval(latido);
        suscripcion.unlisten().catch(() => {});
        try {
          controller.close();
        } catch {
          // ya cerrado
        }
      };

      req.signal.addEventListener("abort", cerrar);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
