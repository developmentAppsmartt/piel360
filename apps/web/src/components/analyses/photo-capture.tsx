"use client";

import { useEffect, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

async function getCroppedImage(imageUrl: string, cropArea: Area): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = imageUrl;
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });

  const canvas = document.createElement("canvas");
  canvas.width = cropArea.width;
  canvas.height = cropArea.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo obtener el contexto del canvas");

  ctx.drawImage(
    image,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    cropArea.width,
    cropArea.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No se pudo recortar la imagen"))), "image/jpeg", 0.95);
  });
}

export function PhotoCapture({
  onCapture,
}: {
  onCapture: (file: File, previewUrl: string) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Imagen original (pre-recorte) sobre la que se reabre el editor cada vez
  // que el usuario pide "Recortar de nuevo" — evita perder calidad al
  // recortar sucesivamente sobre un recorte previo.
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);

  function handleFile(file: File) {
    const url = URL.createObjectURL(file);
    setOriginalUrl(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea(null);
    setCropperOpen(true);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  async function openCamera() {
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 1920, height: 1080 },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setCameraOpen(false);
    }
  }

  function closeCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }

  function takeSnapshot() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) handleFile(new File([blob], "captura.jpg", { type: "image/jpeg" }));
        closeCamera();
      },
      "image/jpeg",
      0.95,
    );
  }

  async function confirmCrop() {
    if (!originalUrl || !croppedArea) return;
    const blob = await getCroppedImage(originalUrl, croppedArea);
    const file = new File([blob], "recorte.jpg", { type: "image/jpeg" });
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    setCropperOpen(false);
    onCapture(file, url);
  }

  function reopenCropper() {
    if (!originalUrl) return;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCropperOpen(true);
  }

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div className="space-y-4">
      {previewUrl ? (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- preview de un blob local, no apta para next/image */}
          <img src={previewUrl} alt="Foto recortada" className="max-h-80 rounded-lg border border-border" />
          <Button type="button" variant="outline" size="sm" onClick={reopenCropper}>
            Recortar de nuevo
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Sube una foto de la lesión o usa la cámara.</p>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => document.getElementById("photo-input")?.click()}>
          Elegir archivo
        </Button>
        <input id="photo-input" type="file" accept="image/*" className="hidden" onChange={handleFileInput} />
        <Button type="button" variant="outline" onClick={openCamera}>
          Usar cámara
        </Button>
      </div>

      <Dialog open={cameraOpen} onOpenChange={(open) => !open && closeCamera()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Capturar foto</DialogTitle>
          </DialogHeader>
          <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg" />
          <Button type="button" onClick={takeSnapshot}>
            Tomar foto
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={cropperOpen} onOpenChange={setCropperOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Recortar foto</DialogTitle>
          </DialogHeader>
          {originalUrl && (
            <div className="relative h-80 w-full overflow-hidden rounded-lg bg-muted">
              <Cropper
                image={originalUrl}
                crop={crop}
                zoom={zoom}
                aspect={4 / 3}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, areaPixels) => setCroppedArea(areaPixels)}
              />
            </div>
          )}
          <Button type="button" onClick={confirmCrop}>
            Recortar y continuar
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
