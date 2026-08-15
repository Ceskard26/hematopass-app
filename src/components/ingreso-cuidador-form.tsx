"use client";

import { useEffect, useRef, useState } from "react";
import { QrVisorOverlay } from "@/components/qr-visor";
import { Mascota } from "@/components/mascota";

const ELEMENT_ID = "hematopass-cuidador-qr-reader";

/**
 * El código del pasaporte se puede escribir o escanear: la tarjeta física
 * que entrega Admisión trae el código impreso Y un QR con el mismo valor.
 * Al escanear, se autocompleta el campo y se envía el mismo formulario
 * (misma acción, mismo camino de error) — no es un flujo paralelo.
 */
export function IngresoCuidadorForm({
  accion,
  error,
}: {
  accion: (formData: FormData) => void;
  error: string | null;
}) {
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [errorCamara, setErrorCamara] = useState<string | null>(null);
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dniRef = useRef<HTMLInputElement>(null);
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
    // Doble-tap: un segundo clic mientras start() ya está en vuelo crearía
    // una segunda instancia de Html5Qrcode sobre el mismo elemento.
    if (scannerRef.current) return;
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
          scanner.stop().catch(() => {});
          setCamaraActiva(false);
          if (inputRef.current) inputRef.current.value = decodedText.trim();
          // El QR de la tarjeta solo trae el código, no el DNI (es personal
          // de quien la sostiene, no algo impreso). Si ya lo había escrito,
          // completa los dos factores y envía; si no, lo lleva ahí a
          // terminar en vez de enviar un formulario a medias.
          if (dniRef.current?.value.trim()) {
            formRef.current?.requestSubmit();
          } else {
            dniRef.current?.focus();
          }
        },
        () => {
          // errores de frame-a-frame (nada detectado aún): se ignoran, son normales
        }
      )
      .then(() => setCamaraActiva(true))
      .catch((err) => {
        console.error("No se pudo iniciar la cámara:", err?.name, err?.message);
        scannerRef.current = null; // libera el guard de doble-tap para permitir reintentar
        setErrorCamara("No pudimos acceder a la cámara. Revisa el permiso de cámara del navegador, o escribe el código abajo.");
      });
  }

  function detenerCamara() {
    scannerRef.current?.stop().catch(() => {});
    scannerRef.current = null; // permite volver a tocar "Escanear el QR"
    setCamaraActiva(false);
  }

  return (
    <form ref={formRef} action={accion} className="hp-in w-full max-w-sm text-center">
      <Mascota estado="animando" size={104} className="hp-in-pop mx-auto mb-4" />
      <h1 className="font-serif text-xl mb-2">Bienvenido a Hematopass</h1>
      <p className="text-base text-text-muted leading-relaxed mb-8">
        Escribe el código de tu pasaporte (o escanea el QR de tu tarjeta) y tu
        DNI. Las dos cosas confirman que eres tú, no solo quien tiene la
        tarjeta en la mano.
      </p>

      {error && (
        <p className="hp-in-fast mb-4 rounded-md bg-status-vencido/10 border border-status-vencido/30 text-status-vencido text-sm px-3 py-2">
          {error}
        </p>
      )}

      <label htmlFor="dni-cuidador" className="block text-left text-sm font-medium mb-1.5">
        Tu DNI
      </label>
      <input
        ref={dniRef}
        id="dni-cuidador"
        name="dni"
        type="text"
        inputMode="numeric"
        maxLength={8}
        placeholder="12345678"
        required
        className="w-full text-center text-lg tracking-wide rounded-md border border-border bg-surface-1 px-4 py-3 mb-6 outline-none transition-shadow focus:ring-2 focus:ring-primary"
      />

      {/*
        El contenedor SIEMPRE está visible, nunca display:none: html5-qrcode
        lee el ancho/alto en el momento de arrancar para dimensionar el
        video, y con el contenedor oculto obtiene 0×0 — el video nunca
        aparece aunque la cámara sí esté activa (detectado en otra sesión de
        pruebas). Antes de escanear se ve como una caja vacía en espera,
        igual que en qr-scanner.tsx.
      */}
      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-surface-2 border border-border mb-3">
        <div id={ELEMENT_ID} className="absolute inset-0 [&_video]:object-cover" />
        <QrVisorOverlay activo={camaraActiva} />
      </div>

      {camaraActiva ? (
        <button
          type="button"
          onClick={detenerCamara}
          className="hp-press text-sm text-text-muted underline mb-6"
        >
          Cancelar
        </button>
      ) : (
        <button
          type="button"
          onClick={iniciarCamara}
          className="hp-press w-full flex items-center justify-center gap-2 rounded-md border border-border px-6 py-3 mb-6 font-semibold hover:bg-surface-2"
        >
          <span aria-hidden="true">▣</span> Escanear el QR
        </button>
      )}

      {errorCamara && (
        <p className="hp-in-fast mb-4 text-sm text-status-vencido">{errorCamara}</p>
      )}

      <div className="flex items-center gap-3 mb-4">
        <span className="flex-1 h-px bg-border" aria-hidden="true" />
        <span className="text-xs uppercase tracking-wide text-text-muted">o escribe el código</span>
        <span className="flex-1 h-px bg-border" aria-hidden="true" />
      </div>

      <input
        ref={inputRef}
        name="codigo"
        type="text"
        inputMode="text"
        autoCapitalize="characters"
        placeholder="HP-00001"
        aria-label="Código del pasaporte"
        required
        className="w-full text-center text-lg tracking-wide rounded-md border border-border bg-surface-1 px-4 py-3 mb-4 outline-none transition-shadow focus:ring-2 focus:ring-primary"
      />

      <button
        type="submit"
        className="hp-press w-full rounded-md bg-primary text-primary-ink py-3 text-base font-semibold hover:opacity-90"
      >
        Ingresar
      </button>
    </form>
  );
}
