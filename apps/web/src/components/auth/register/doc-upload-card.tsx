"use client";

import type { ChangeEvent } from "react";
import { CloudUpload } from "lucide-react";

/** Tarjeta para adjuntar un documento opcional en los registros. */
export function DocUploadCard({
  title,
  file,
  onChange,
}: {
  title: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-3 py-5 text-center transition hover:border-sky-400">
      <CloudUpload className="size-7 text-sky-500" />
      <span className="text-sm font-semibold text-zinc-900">{title}</span>
      <span className="text-xs text-zinc-500">{file ? file.name : "PDF, JPG o PNG · opcional"}</span>
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        className="sr-only"
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}
