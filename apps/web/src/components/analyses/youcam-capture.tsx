"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

const YMK_SDK_URL = "https://plugins-media.makeupar.com/v2.5-camera-kit/sdk.js";
const MIN_IDEAL_HEIGHT = 1080;
const CAPTURE_WIDTH = 1080;
const CAPTURE_HEIGHT = 1440;

interface YMKCapturedResult {
  images: { image: string; width: number; height: number }[];
}

// SDK externo sin tipos oficiales — declaramos solo lo que usamos.
interface YMKGlobal {
  init(args: {
    faceDetectionMode: string;
    imageFormat: string;
    language: string;
    qualityLevel: string;
    videoQuality: string;
    disableCameraResolutionCheck: boolean;
    width: number;
    height: number;
  }): void;
  openCameraKit(): void;
  close(): void;
  addEventListener(event: string, callback: (result?: YMKCapturedResult) => void): void;
}

declare global {
  interface Window {
    YMK?: YMKGlobal;
  }
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

export function YoucamCapture({
  onCapture,
}: {
  onCapture: (blob: Blob) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [lowResWarning, setLowResWarning] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [captureRejected, setCaptureRejected] = useState(false);
  const [rejectedResolution, setRejectedResolution] = useState<string | null>(null);

  useEffect(() => {
    if (!sdkReady || !window.YMK || !containerRef.current) return;
    const YMK = window.YMK;

    YMK.init({
      faceDetectionMode: "skincare",
      imageFormat: "base64",
      // Código propio de Perfect Corp (3 letras), no ISO 639-1 — confirmado
      // en la documentación pública del SDK Camera Kit: 'esp' es correcto
      // para español (no 'es').
      language: "esp",
      qualityLevel: "relaxed", // Configurado según docs/js-camera-kit.MD
      videoQuality: "1080p",
      disableCameraResolutionCheck: true,
      width: CAPTURE_WIDTH,
      height: CAPTURE_HEIGHT,
    });

    YMK.addEventListener("faceDetectionCaptured", (result) => {
      const captured = result?.images?.[0];
      if (!captured?.image) return;

      // A diferencia del chequeo de `cameraOpened` (que solo inspecciona el
      // stream de video en vivo, una aproximación), acá el SDK ya nos da el
      // ancho/alto reales de la foto capturada — en iOS Safari, desacoplar el
      // tamaño del contenedor de `width`/`height` evita que el canvas interno
      // sea limitado al tamaño del <div>.
      if (Math.min(captured.width, captured.height) < MIN_IDEAL_HEIGHT) {
        setRejectedResolution(`${captured.width}×${captured.height}`);
        setCaptureRejected(true);
        return;
      }
      setCaptureRejected(false);
      setRejectedResolution(null);
      dataUrlToBlob(captured.image).then(onCapture);
    });

    YMK.addEventListener("cameraOpened", () => {
      // Mismo chequeo que el Laravel viejo — solo advierte, no bloquea
      // (pedido del cliente: "degradar con gracia, no bloquear el flujo").
      const video = containerRef.current?.querySelector("video");
      if (video && video.videoHeight && video.videoHeight < MIN_IDEAL_HEIGHT) {
        setLowResWarning(true);
      }
    });

    YMK.addEventListener("cameraFailed", () => setCameraError(true));

    // Documentado en docs/js-camera-kit.MD: "Fired when the device resolution
    // does not meet the minimum requirements for the selected mode" — no se
    // escuchaba en absoluto antes de este fix.
    YMK.addEventListener("unsupportedResolution", () => setCaptureRejected(true));

    YMK.openCameraKit();

    return () => {
      window.YMK?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo se re-ejecuta cuando el SDK termina de cargar
  }, [sdkReady]);

  return (
    <div className="space-y-3">
      <Script src={YMK_SDK_URL} strategy="afterInteractive" onLoad={() => setSdkReady(true)} />

      {cameraError && (
        <p className="text-sm text-destructive">
          No se pudo acceder a la cámara. Verifica los permisos e intenta de nuevo.
        </p>
      )}
      {captureRejected && !cameraError && (
        <p className="text-sm text-destructive">
          La foto capturada quedó en muy baja resolución para el análisis
          {rejectedResolution ? ` (${rejectedResolution})` : ""}. Verifica la iluminación y la estabilidad de la cámara, y vuelve a intentarlo.
        </p>
      )}
      {lowResWarning && !cameraError && !captureRejected && (
        <p className="text-sm text-muted-foreground">
          Tu cámara no alcanza la resolución ideal (1080p) — el análisis continúa, pero la
          calidad puede verse afectada.
        </p>
      )}

      <div id="YMK-module" ref={containerRef} className="h-96 w-full rounded-lg border border-border bg-muted" />
    </div>
  );
}
