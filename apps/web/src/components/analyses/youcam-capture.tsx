"use client";

import { YOUCAM_HD_MIN_SHORT_SIDE_PX, YOUCAM_UPSCALE_MIN_SHORT_SIDE_PX } from "@piel360/shared";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";

const YMK_SDK_URL = "https://plugins-media.makeupar.com/v2.5-camera-kit/sdk.js";
// Piso real de bloqueo — el mismo que usa el backend (youcam-analyses.service.ts):
// por debajo de esto no se intenta escalar la imagen, es una foto genuinamente
// de baja calidad. Entre este piso y YOUCAM_HD_MIN_SHORT_SIDE_PX (1080, el
// mínimo real de YouCam), el backend redimensiona en vez de rechazar — bloquear
// acá con el mismo umbral que el backend evita rechazar en el navegador algo
// que el servidor de todos modos aceptaría.
const MIN_CAPTURE_SHORT_SIDE = YOUCAM_UPSCALE_MIN_SHORT_SIDE_PX;

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
    const rect = containerRef.current.getBoundingClientRect();
    const containerWidth = Math.round(rect.width) || 360;
    const containerHeight = Math.max(480, Math.round(rect.height));

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
      width: containerWidth,
      height: containerHeight,
    });

    YMK.addEventListener("faceDetectionCaptured", (result) => {
      const captured = result?.images?.[0];
      if (!captured?.image) return;

      if (Math.min(captured.width, captured.height) < MIN_CAPTURE_SHORT_SIDE) {
        setRejectedResolution(`${captured.width}×${captured.height}`);
        setCaptureRejected(true);
        return;
      }
      setCaptureRejected(false);
      setRejectedResolution(null);
      dataUrlToBlob(captured.image).then(onCapture);
    });

    YMK.addEventListener("cameraOpened", () => {
      const video = containerRef.current?.querySelector("video");
      if (video && video.videoHeight && video.videoHeight < YOUCAM_HD_MIN_SHORT_SIDE_PX) {
        setLowResWarning(true);
      }
    });

    YMK.addEventListener("cameraFailed", () => setCameraError(true));

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

      <div
        id="YMK-module"
        ref={containerRef}
        className="relative h-[480px] w-full overflow-hidden rounded-lg border border-border bg-muted"
      />
    </div>
  );
}
