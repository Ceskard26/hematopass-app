"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { obtenerCola, eliminarDeCola } from "@/lib/offline-queue";
import { validarEscaneo } from "@/lib/actions-cuidador";

/**
 * Drena la cola de escaneos guardados en IndexedDB cuando vuelve la señal.
 * Se monta una sola vez en el layout del cuidador — así funciona sin
 * importar en qué pantalla esté la familia cuando la conexión regresa, no
 * solo si siguen en /escanear.
 */
export function SincronizadorOffline() {
  const [pendientes, setPendientes] = useState(0);
  const router = useRouter();

  useEffect(() => {
    let cancelado = false;

    async function drenar() {
      const cola = await obtenerCola();
      if (cancelado) return;
      setPendientes(cola.length);
      if (cola.length === 0 || !navigator.onLine) return;

      let alguno = false;
      for (const item of cola) {
        try {
          // No importa si el servidor responde ok:true u ok:false — en
          // ambos casos ya dio una respuesta definitiva y el ítem sale de
          // la cola. Solo una excepción (sigue sin red) lo deja en espera.
          await validarEscaneo(item.qrToken);
          await eliminarDeCola(item.id);
          alguno = true;
        } catch {
          break;
        }
      }

      const restante = await obtenerCola();
      if (cancelado) return;
      setPendientes(restante.length);
      if (alguno) router.refresh();
    }

    drenar();
    window.addEventListener("online", drenar);
    return () => {
      cancelado = true;
      window.removeEventListener("online", drenar);
    };
  }, [router]);

  if (pendientes === 0) return null;

  return (
    <div
      className="fixed top-0 inset-x-0 z-50 text-center text-xs py-1.5 font-medium"
      style={{ backgroundColor: "var(--status-en-curso)", color: "#fff" }}
      role="status"
    >
      {pendientes} escaneo{pendientes === 1 ? "" : "s"} pendiente{pendientes === 1 ? "" : "s"} de
      enviar
    </div>
  );
}
