"use client";

/**
 * Marco superpuesto sobre el video de html5-qrcode — la librería solo
 * dibuja un recuadro plano (ver la captura que motivó esto). Las esquinas
 * y la línea de barrido son propias, en el color del sello, y comunican
 * dónde encuadrar el QR — no son decoración suelta.
 */
export function QrVisorOverlay({ activo }: { activo: boolean }) {
  if (!activo) return null;

  return (
    <div className="hp-in-scale pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="relative h-[70%] w-[70%] max-h-[220px] max-w-[220px]">
        <span
          className="absolute left-0 top-0 h-9 w-9 rounded-tl-xl border-l-[3px] border-t-[3px]"
          style={{ borderColor: "var(--color-sello)" }}
        />
        <span
          className="absolute right-0 top-0 h-9 w-9 rounded-tr-xl border-r-[3px] border-t-[3px]"
          style={{ borderColor: "var(--color-sello)" }}
        />
        <span
          className="absolute bottom-0 left-0 h-9 w-9 rounded-bl-xl border-b-[3px] border-l-[3px]"
          style={{ borderColor: "var(--color-sello)" }}
        />
        <span
          className="absolute bottom-0 right-0 h-9 w-9 rounded-br-xl border-b-[3px] border-r-[3px]"
          style={{ borderColor: "var(--color-sello)" }}
        />
        <div
          className="hp-scan-line absolute inset-x-2 h-0.5 rounded-full"
          style={{ backgroundColor: "var(--color-sello)", boxShadow: "0 0 10px 1px var(--color-sello)" }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
