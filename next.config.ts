import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Contenedor mínimo para el despliegue en Docker (F9).
  output: "standalone",

  // Caddy ya comprime (encode zstd gzip en el Caddyfile) — que Next también
  // comprima es trabajo duplicado, y además rompía el registro del service
  // worker: gzip fuerza "Transfer-Encoding: chunked" sin Content-Length, y
  // esa combinación específica falla en el algoritmo de fetch de Service
  // Worker de Chromium a través de proxies anidados ("An unknown error
  // occurred when fetching the script"). Con compress:false, Next sirve
  // /sw.js con Content-Length real y Caddy es el único que comprime.
  compress: false,

  // Hay un package-lock.json ajeno en C:\Users\Cesar (fuera de este repo)
  // que Turbopack detecta como posible raíz de workspace. Se fija la raíz
  // explícita al proyecto para que no dependa de esa carpeta.
  turbopack: {
    root: path.join(__dirname),
  },

  // Deliberadamente SIN cacheComponents: true. Hematopass es casi enteramente
  // dinámica y autenticada (dashboards por rol, ruta en tiempo real). Activar
  // Cache Components exigiría envolver cada lectura runtime en <Suspense> o
  // "use cache" en todo el árbol — ceremonia que no compensa bajo el tiempo
  // de una hackatón. Se usa el modelo de cacheo clásico (dynamic por defecto).
};

export default nextConfig;
