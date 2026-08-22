"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUploadRoutineStepMedia } from "@/lib/queries/routines";

const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm";

export function RoutineStepMediaUpload({
  routineId,
  stepId,
  currentMediaUrl,
  currentMediaType,
}: {
  routineId: string;
  stepId: string;
  currentMediaUrl?: string | null;
  currentMediaType?: "image" | "video" | "gif" | null;
}) {
  const uploadMutation = useUploadRoutineStepMedia(routineId, stepId);
  const [preview, setPreview] = useState<string | null>(currentMediaUrl ?? null);
  const [previewIsVideo, setPreviewIsVideo] = useState(currentMediaType === "video");
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      setPreviewIsVideo(file.type.startsWith("video/"));
      await uploadMutation.mutateAsync(file);
    },
    [uploadMutation],
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">
        Imagen, video o GIF de este paso
      </label>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={[
          "relative flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-colors",
          isDragging
            ? "border-ring bg-ring/5"
            : "border-border bg-muted/30 hover:border-ring/60 hover:bg-muted/50",
        ].join(" ")}
      >
        {preview ? (
          <>
            {previewIsVideo ? (
              <video src={preview} controls className="max-h-32 rounded-lg" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Vista previa" className="max-h-32 rounded-lg object-contain" />
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute top-2 right-2 bg-background/80 hover:bg-background"
              onClick={(e) => {
                e.stopPropagation();
                setPreview(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
            >
              <X className="size-4" />
              <span className="sr-only">Quitar</span>
            </Button>
          </>
        ) : uploadMutation.isPending ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Upload className="size-6 animate-bounce" />
            <p className="text-sm">Subiendo...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImageIcon className="size-6" />
            <p className="text-sm font-medium">Arrastra o haz clic para seleccionar</p>
            <p className="text-xs">Imagen, GIF o video (mp4/webm) — máx. 25 MB</p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="sr-only"
        onChange={onInputChange}
      />

      {uploadMutation.isError && (
        <p className="text-sm text-destructive">No se pudo subir el archivo. Intenta de nuevo.</p>
      )}
    </div>
  );
}
