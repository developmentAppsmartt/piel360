"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUploadProductImage } from "@/lib/queries/products";

interface ProductImageUploadProps {
  productId: string;
  currentImageUrl?: string | null;
  onUploaded?: (url: string) => void;
}

export function ProductImageUpload({
  productId,
  currentImageUrl,
  onUploaded,
}: ProductImageUploadProps) {
  const uploadMutation = useUploadProductImage(productId);
  const [preview, setPreview] = useState<string | null>(currentImageUrl ?? null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      const result = await uploadMutation.mutateAsync(file);
      onUploaded?.(result.imageUrl ?? objectUrl);
    },
    [uploadMutation, onUploaded]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">
        Imagen del producto
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
          "relative flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition-colors",
          isDragging
            ? "border-ring bg-ring/5"
            : "border-border bg-muted/30 hover:border-ring/60 hover:bg-muted/50",
        ].join(" ")}
      >
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Vista previa"
              className="max-h-40 rounded-lg object-contain"
            />
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
              <span className="sr-only">Quitar imagen</span>
            </Button>
          </>
        ) : (
          <>
            {uploadMutation.isPending ? (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Upload className="size-8 animate-bounce" />
                <p className="text-sm">Subiendo imagen...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <ImageIcon className="size-8" />
                <p className="text-sm font-medium">
                  Arrastra una imagen o haz clic para seleccionar
                </p>
                <p className="text-xs">PNG, JPG, WEBP — máx. 5 MB</p>
              </div>
            )}
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={onInputChange}
      />

      {uploadMutation.isError && (
        <p className="text-sm text-destructive">
          Error al subir la imagen. Intenta de nuevo.
        </p>
      )}
    </div>
  );
}
