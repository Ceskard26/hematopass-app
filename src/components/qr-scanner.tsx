"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { validarEscaneo } from "@/lib/actions-cuidador";
import { encolarEscaneo } from "@/lib/offline-queue";
import { Sello } from "@/components/sello";

type Resultado =
  | { estado: "exito"; pasoId: string; tipo: string; tituloClinico: string; ubicacionNombre: string }
  | { estado: "error"; motivo: string }
  | { estado: "encolado" }
  | null;

const ELEMENT_ID = "hematopass-qr-reader";

/**
 * Riesgo documentado (docs/plan-desarrollo.md §8): "la cámara QR falla en
 * el celular del jurado". Mitigación: modo manual siempre visible, no
 * escondido detrás de un link "problemas?" — es una opción de primera
 * clase, no un plan B avergonzado.
 */
export function QrScanner() {
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [errorCamara, setErrorCamara] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado>(null);
  const [codigoManual, setCodigoManual] = useState("");
  const [pending, startTransition] = useTransition();
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);

  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  async function iniciarCamara() {
    setErrorCamara(null);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(ELEMENT_ID);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 220 },
        (decodedText) => {
          scanner.pause(true);
          procesar(decodedText);
        },
        () => {
          // errores de frame-a-frame (nada detectado aún): se ignoran, son normales
        }
      );
      setCamaraActiva(true);
    } catch {
      setErrorCamara(
        "No pudimos acceder a la cámara. Usa el código manual de abajo."
      );
    }
  }

  function procesar(token: string) {
    startTransition(async () => {
      const limpio = token.trim();
      try {
        const r = await validarEscaneo(limpio);
        if (r.ok) {
          setResultado({
            estado: "exito",
            pasoId: r.pasoId,
            tipo: r.tipo,
            tituloClinico: r.tituloClinico,
            ubicacionNombre: r.ubicacionNombre,
          });
        } else {
          setResultado({ estado: "error", motivo: r.motivo });
          // deja reintentar sin recargar la página
          setTimeout(() => scannerRef.current?.resume(), 1500);
        }
      } catch {
        // El Server Action ni siquiera pudo salir del teléfono: sin señal.
        // No es un error de validación (eso vuelve como {ok:false}), es
        // falta de red — se guarda la intención y se reintenta al volver.
        await encolarEscaneo(limpio);
        setResultado({ estado: "encolado" });
        setTimeout(() => scannerRef.current?.resume(), 1500);
      }
    });
  }

  function enviarManual() {
    if (!codigoManual.trim()) return;
    procesar(codigoManual);
  }

  if (resultado?.estado === "exito") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 min-h-full">
        <div className="mb-4">
          <Sello
            estado="sellado"
            tipo={resultado.tipo as Parameters<typeof Sello>[0]["tipo"]}
            ubicacion={resultado.ubicacionNombre}
            semilla={resultado.pasoId}
            animar
            size={104}
          />
        </div>
        <h1 className="font-serif text-xl mb-2">¡Sello registrado!</h1>
        <p className="text-base text-text-muted mb-1">{resultado.tituloClinico}</p>
        <p className="text-sm text-text-muted mb-8">{resultado.ubicacionNombre}</p>
        <Link
          href="/cuidador/ahora"
          className="w-full max-w-xs min-h-12 flex items-center justify-center rounded-lg bg-primary text-primary-ink py-4 text-md font-semibold text-center transition-colors hover:opacity-90"
        >
          Ver mi próximo paso
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col px-6 pt-8 min-h-full">
      <h1 className="font-serif text-lg mb-1">Escanear código</h1>
      <p className="text-sm text-text-muted mb-6">
        Busca el sticker con el código QR pegado en la ventanilla.
      </p>

      <div
        id={ELEMENT_ID}
        className="w-full aspect-square rounded-lg overflow-hidden bg-surface-2 border border-border mb-4"
      />

      {!camaraActiva && (
        <button
          type="button"
          onClick={iniciarCamara}
          className="w-full rounded-lg bg-primary text-primary-ink py-3.5 text-base font-semibold mb-6 hover:opacity-90 transition-colors"
        >
          Iniciar cámara
        </button>
      )}

      {errorCamara && (
        <p className="text-sm text-status-vencido mb-4">{errorCamara}</p>
      )}

      {resultado?.estado === "error" && (
        <p className="text-sm text-status-vencido mb-4">{resultado.motivo}</p>
      )}
      {resultado?.estado === "encolado" && (
        <p className="text-sm mb-4" style={{ color: "var(--status-en-curso)" }}>
          Sin señal ahora mismo. Guardamos tu escaneo y lo enviaremos apenas
          vuelva la conexión.
        </p>
      )}

      <div className="mt-auto pt-6 border-t border-border">
        <p className="text-sm font-medium mb-2">¿La cámara no funciona?</p>
        <p className="text-xs text-text-muted mb-3">
          Pide al personal de la ventanilla el código impreso y escríbelo aquí.
        </p>
        <div className="flex gap-2">
          <input
            value={codigoManual}
            onChange={(e) => setCodigoManual(e.target.value)}
            placeholder="Código de la ventanilla"
            className="flex-1 rounded-md border border-border bg-surface-1 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            onClick={enviarManual}
            disabled={pending}
            className="rounded-md border border-border px-4 py-2.5 text-sm font-medium hover:bg-surface-2 transition-colors disabled:opacity-50"
          >
            Validar
          </button>
        </div>
      </div>
    </div>
  );
}
