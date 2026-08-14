"use client";

import { useEffect } from "react";

/**
 * Alcance explícito "/cuidador/": el dashboard clínico no necesita ni debe
 * cachear nada offline (datos desactualizados en una pantalla clínica son
 * peor que un error de red). Registrar con un scope más angosto que la raíz
 * del script (servido en /sw.js) no requiere cabeceras especiales.
 */
export function ServiceWorkerRegistro() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/cuidador/" }).catch(() => {});
    }
  }, []);

  return null;
}
