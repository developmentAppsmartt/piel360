"use client";

import Script from "next/script";
import { useEffect } from "react";

/**
 * Chat de soporte (Tawk.to). El id de propiedad viaja en el HTML del cliente
 * —es público por diseño—, así que va como constante y no como secreto.
 */
const TAWK_SRC = "https://embed.tawk.to/6a9cd4b0d0128c34498225b8/1k1q9tkba";

// Sin `crossOrigin`: el snippet oficial pone `crossorigin="*"`, que no es un
// valor valido del atributo y el navegador interpreta como "anonymous". Eso
// activa la comprobacion CORS, y Tawk responde 500 sin cabeceras CORS cuando
// el Origin no esta entre sus dominios permitidos (p. ej. localhost): el
// script no carga y el chat nunca aparece. Cargado como un <script src>
// normal, sin CORS, funciona en cualquier origen.

type TawkApi = {
  onLoad?: () => void;
  showWidget?: () => void;
  hideWidget?: () => void;
};

declare global {
  interface Window {
    Tawk_API?: TawkApi;
    Tawk_LoadStart?: Date;
  }
}

// El script embebido espera encontrar estos globales ya definidos; el snippet
// oficial los crea antes de inyectarse. Al hacerlo en el módulo se ejecuta al
// importarlo, es decir antes de que <Script> corra.
if (typeof window !== "undefined") {
  window.Tawk_API = window.Tawk_API ?? {};
  window.Tawk_LoadStart = window.Tawk_LoadStart ?? new Date();
}

/**
 * Tawk inyecta su burbuja en `document.body`, fuera del árbol de React: una vez
 * cargada sobrevive a la navegación del router y seguiría visible en el resto
 * del panel. Como el chat está acotado a Soporte, se oculta al salir y se
 * vuelve a mostrar al entrar (`next/script` no reejecuta un script ya cargado).
 */
export function TawkToWidget() {
  useEffect(() => {
    window.Tawk_API?.showWidget?.();

    return () => {
      window.Tawk_API?.hideWidget?.();
    };
  }, []);

  return (
    <Script
      id="tawk-to"
      src={TAWK_SRC}
      strategy="afterInteractive"
      // En la primera carga la API aún no existe cuando corre el efecto de
      // arriba; `onLoad` cubre ese caso.
      onLoad={() => window.Tawk_API?.showWidget?.()}
    />
  );
}
