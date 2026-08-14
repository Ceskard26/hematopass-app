"use client";

import { useEffect, useRef, useState } from "react";

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
          scanner.stop().catch(() => {});
          setCamaraActiva(false);
          if (inputRef.current) inputRef.current.value = decodedText.trim();
          formRef.current?.requestSubmit();
        },
        () => {
          // errores de frame-a-frame (nada detectado aún): se ignoran, son normales
        }
      );
      setCamaraActiva(true);
    } catch {
      setErrorCamara("No pudimos acceder a la cámara. Escribe el código abajo.");
    }
  }

  function detenerCamara() {
    scannerRef.current?.stop().catch(() => {});
    setCamaraActiva(false);
  }

  return (
    <form ref={formRef} action={accion} className="w-full max-w-sm text-center">
      <img
        src="/brand-badge.png"
        alt=""
        aria-hidden="true"
        width={96}
        height={96}
        className="mx-auto mb-4 h-24 w-24 rounded-full"
      />
      <h1 className="font-serif text-xl mb-2">Bienvenido a Hematopass</h1>
      <p className="text-base text-text-muted leading-relaxed mb-8">
        Escribe el código de tu pasaporte o escanea el QR de tu tarjeta. Está
        impreso en la tarjeta que te dieron en Admisión.
      </p>

      {error && (
        <p className="mb-4 rounded-md bg-status-vencido/10 border border-status-vencido/30 text-status-vencido text-sm px-3 py-2">
          {error}
        </p>
      )}

      {/*
        El div SIEMPRE está montado (nunca condicional a camaraActiva):
        html5-qrcode busca este id en el DOM al construirse, antes de que
        la cámara arranque — si el div todavía no existe, falla siempre,
        en cualquier navegador. Se oculta con CSS, no se desmonta.
      */}
      <div
        id={ELEMENT_ID}
        className={`w-full aspect-square rounded-lg overflow-hidden bg-surface-2 border border-border mb-3 ${camaraActiva ? "" : "hidden"}`}
      />

      {camaraActiva ? (
        <button
          type="button"
          onClick={detenerCamara}
          className="text-sm text-text-muted underline mb-6"
        >
          Cancelar
        </button>
      ) : (
        <button
          type="button"
          onClick={iniciarCamara}
          className="w-full flex items-center justify-center gap-2 rounded-md border border-border px-6 py-3 mb-6 font-semibold transition-colors hover:bg-surface-2"
        >
          <span aria-hidden="true">▣</span> Escanear el QR
        </button>
      )}

      {errorCamara && (
        <p className="mb-4 text-sm text-status-vencido">{errorCamara}</p>
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
        required
        className="w-full text-center text-lg tracking-wide rounded-md border border-border bg-surface-1 px-4 py-3 mb-4 outline-none focus:ring-2 focus:ring-primary"
      />

      <button
        type="submit"
        className="w-full rounded-md bg-primary text-primary-ink py-3 text-base font-semibold transition-colors hover:opacity-90"
      >
        Ingresar
      </button>
    </form>
  );
}
