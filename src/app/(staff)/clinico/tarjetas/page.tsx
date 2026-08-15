import QRCode from "qrcode";
import { listarPacientesClinico } from "@/lib/queries";

/**
 * Tarjetas de paciente imprimibles — el "pasaporte" físico que Admisión
 * entrega a la familia. El QR codifica el mismo valor que el campo de
 * texto (paciente.codigo, ej. "HP-00001"): es lo que
 * src/components/ingreso-cuidador-form.tsx espera leer al escanear en
 * /cuidador. Sin esta página no hay ningún QR de paciente real en el
 * sistema — antes de esto, "escanear el QR" en el ingreso del cuidador
 * apuntaba la cámara a la nada.
 */
export default async function TarjetasPage() {
  const pacientes = await listarPacientesClinico();
  const conQr = await Promise.all(
    pacientes.map(async (p) => ({
      ...p,
      qrDataUrl: await QRCode.toDataURL(p.codigo, { margin: 1, width: 240 }),
    }))
  );

  return (
    <main className="p-8 max-w-[1200px]">
      <h1 className="font-serif text-lg mb-1">Tarjetas de paciente</h1>
      <p className="text-sm text-text-muted mb-8">
        Imprime y entrega en Admisión. El QR es el mismo código del
        pasaporte — sirve para escribirlo a mano o escanearlo al ingresar en{" "}
        <span className="font-mono">/cuidador</span>.
      </p>

      <div className="grid grid-cols-3 gap-6">
        {conQr.map((p) => (
          <div
            key={p.id}
            className="rounded-lg border border-border bg-surface-1 p-5 text-center print:break-inside-avoid"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.qrDataUrl}
              alt={`Código QR de ${p.nombre}`}
              className="mx-auto mb-3"
              width={160}
              height={160}
            />
            <p className="font-medium">{p.nombre}</p>
            <p className="text-xs text-text-muted">{p.dxNombre}</p>
            <p className="mt-2 text-sm font-mono tracking-wide">{p.codigo}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
