"use client";

import { useRef, type RefObject } from "react";
import Script from "next/script";
import {
  RECAPTCHA_SCRIPT_URL,
  renderRecaptchaCheckbox,
} from "@/lib/recaptcha";

/**
 * Casilla «No soy un robot». El id del widget queda en `widgetIdRef` para
 * que el formulario la reinicie si el login falla: el token ya se gastó.
 */
export function RecaptchaCheckbox({
  action,
  widgetIdRef,
  onToken,
}: {
  action: string;
  widgetIdRef: RefObject<number | null>;
  onToken: (token: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // `onReady` vuelve a llamarse al regresar a la página con el script ya
  // cargado; dibujar dos veces en el mismo div lanza un error de Google.
  const rendering = useRef(false);

  if (!RECAPTCHA_SCRIPT_URL) return null;

  async function draw() {
    if (rendering.current || !containerRef.current) return;
    rendering.current = true;
    widgetIdRef.current = await renderRecaptchaCheckbox(
      containerRef.current,
      action,
      onToken,
    );
    if (widgetIdRef.current == null) rendering.current = false;
  }

  return (
    <>
      <Script src={RECAPTCHA_SCRIPT_URL} strategy="afterInteractive" onReady={() => void draw()} />
      <div ref={containerRef} className="flex min-h-[78px] justify-center" />
    </>
  );
}
