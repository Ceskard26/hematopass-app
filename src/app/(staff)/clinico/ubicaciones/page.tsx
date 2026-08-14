import QRCode from "qrcode";
import { listarUbicaciones } from "@/lib/queries";

/**
 * Códigos QR imprimibles para cada ventanilla. Cada sticker cuesta una
 * impresión — cero hardware nuevo (docs/arquitectura.md §2). Esta pantalla
 * es tanto la herramienta de impresión real como la forma más rápida de
 * probar el flujo de escaneo del cuidador durante el desarrollo.
 */
export default async function UbicacionesPage() {
  const ubicaciones = await listarUbicaciones();
  const conQr = await Promise.all(
    ubicaciones.map(async (u) => ({
      ...u,
      qrDataUrl: await QRCode.toDataURL(u.qrToken, { margin: 1, width: 240 }),
    }))
  );

  return (
    <main className="p-8 max-w-[1200px]">
      <h1 className="font-serif text-lg mb-1">Códigos QR de ventanillas</h1>
      <p className="text-sm text-text-muted mb-8">
        Imprime y pega cada sticker en su ventanilla física. El código es
        estático — no expira ni cambia.
      </p>

      <div className="grid grid-cols-3 gap-6">
        {conQr.map((u) => (
          <div
            key={u.id}
            className="rounded-lg border border-border bg-surface-1 p-5 text-center print:break-inside-avoid"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={u.qrDataUrl}
              alt={`Código QR de ${u.nombre}`}
              className="mx-auto mb-3"
              width={160}
              height={160}
            />
            <p className="font-medium">{u.nombre}</p>
            <p className="text-xs text-text-muted">
              {u.piso}
              {u.modulo ? ` · Módulo ${u.modulo}` : ""}
              {u.ventanilla ? ` · ${u.ventanilla}` : ""}
            </p>
            <p className="mt-2 text-[10px] text-text-muted font-mono break-all">{u.qrToken}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
