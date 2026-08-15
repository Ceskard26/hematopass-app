"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { validarEscaneo } from "@/lib/actions-cuidador";
import { encolarEscaneo } from "@/lib/offline-queue";
import { Sello } from "@/components/sello";
import { QrVisorOverlay } from "@/components/qr-visor";

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
  // Constructor de Html5Qrcode precargado en el módulo (no en el clic) — ver
  // el comentario dentro de iniciarCamara() sobre por qué esto importa.
  const Html5QrcodeRef = useRef<typeof import("html5-qrcode").Html5Qrcode | null>(null);

  useEffect(() => {
    import("html5-qrcode").then(({ Html5Qrcode }) => {
      Html5QrcodeRef.current = Html5Qrcode;
    });
    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  function iniciarCamara() {
    setErrorCamara(null);

    // Nada de `await` antes de pedir la cámara: en Safari/WebKit (iOS), un
    // `await` entre el clic del usuario y getUserMedia() puede romper la
    // asociación con el gesto y el navegador bloquea la cámara EN SILENCIO
    // — sin diálogo de permiso, sin excepción visible. Por eso la librería
    // se precarga en useEffect (arriba) y aquí solo se usa la referencia ya
    // resuelta, de forma síncrona.
    const Html5Qrcode = Html5QrcodeRef.current;
    if (!Html5Qrcode) {
      setErrorCamara("Todavía estamos cargando el lector. Intenta de nuevo en un segundo.");
      return;
    }

    const scanner = new Html5Qrcode(ELEMENT_ID);
    scannerRef.current = scanner;
    scanner
      .start(
        { facingMode: "environment" },
        { fps: 12, qrbox: 240, aspectRatio: 1 },
        (decodedText) => {
          scanner.pause(true);
          procesar(decodedText);
        },
        () => {
          // errores de frame-a-frame (nada detectado aún): se ignoran, son normales
        }
      )
      .then(() => setCamaraActiva(true))
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error("No se pudo iniciar la cámara:", err?.name, err?.message);
        setErrorCamara(
          "No pudimos acceder a la cámara. Revisa el permiso de cámara del navegador, o usa el código manual de abajo."
        );
      });
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
        <h1 className="hp-in font-serif text-xl mb-2" style={{ animationDelay: "120ms" }}>
          ¡Sello registrado!
        </h1>
        <p className="hp-in text-base text-text-muted mb-1" style={{ animationDelay: "180ms" }}>
          {resultado.tituloClinico}
        </p>
        <p className="hp-in text-sm text-text-muted mb-8" style={{ animationDelay: "220ms" }}>
          {resultado.ubicacionNombre}
        </p>
        <Link
          href="/cuidador/ahora"
          className="hp-press hp-in w-full max-w-xs min-h-12 flex items-center justify-center rounded-lg bg-primary text-primary-ink py-4 text-md font-semibold text-center hover:opacity-90"
          style={{ animationDelay: "280ms" }}
        >
          Ver mi próximo paso
        </Link>
      </div>
    );
  }

  return (
    <div className="hp-in-fast flex-1 flex flex-col px-6 pt-8 min-h-full">
      <h1 className="font-serif text-lg mb-1">Escanear código</h1>
      <p className="text-sm text-text-muted mb-6">
        Busca el sticker con el código QR pegado en la ventanilla.
      </p>

      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-surface-2 border border-border mb-4">
        <div id={ELEMENT_ID} className="absolute inset-0 [&_video]:object-cover" />
        <QrVisorOverlay activo={camaraActiva} />
      </div>

      {!camaraActiva && (
        <button
          type="button"
          onClick={iniciarCamara}
          className="hp-press w-full rounded-lg bg-primary text-primary-ink py-3.5 text-base font-semibold mb-6 hover:opacity-90"
        >
          Iniciar cámara
        </button>
      )}

      {errorCamara && (
        <p className="hp-in-fast text-sm text-status-vencido mb-4">{errorCamara}</p>
      )}

      {resultado?.estado === "error" && (
        <p className="hp-in-fast text-sm text-status-vencido mb-4">{resultado.motivo}</p>
      )}
      {resultado?.estado === "encolado" && (
        <p className="hp-in-fast text-sm mb-4" style={{ color: "var(--status-en-curso)" }}>
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
            className="flex-1 rounded-md border border-border bg-surface-1 px-3 py-2.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            onClick={enviarManual}
            disabled={pending}
            className="hp-press rounded-md border border-border px-4 py-2.5 text-sm font-medium hover:bg-surface-2 disabled:opacity-50"
          >
            Validar
          </button>
        </div>
      </div>
    </div>
  );
}
