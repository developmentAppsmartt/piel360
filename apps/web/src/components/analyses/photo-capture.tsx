"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function PhotoCapture({
  onCapture,
}: {
  onCapture: (file: File, previewUrl: string) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function handleFile(file: File) {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    onCapture(file, url);
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

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div className="space-y-4">
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- preview de un blob local, no apta para next/image
        <img src={previewUrl} alt="Foto seleccionada" className="max-h-80 rounded-lg border border-border" />
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
    </div>
  );
}
