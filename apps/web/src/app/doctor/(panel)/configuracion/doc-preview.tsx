import type { ChangeEvent } from "react";
import { CloudUpload } from "lucide-react";

function isPdfUrl(url: string | null | undefined, key: string | null | undefined) {
  const src = `${url ?? ""} ${key ?? ""}`.toLowerCase();
  return src.includes(".pdf");
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {hint ? (
        <span className="text-xs text-muted-foreground">{hint}</span>
      ) : null}
      {children}
    </label>
  );
}

export function DocPreview({
  title,
  url,
  fileKey,
  file,
  onChange,
  optional = false,
}: {
  title: string;
  url: string | null | undefined;
  fileKey: string | null | undefined;
  file: File | null;
  onChange: (file: File | null) => void;
  /** No hace falta para completar el registro. */
  optional?: boolean;
}) {
  const previewUrl = file ? URL.createObjectURL(file) : url;
  const pdf = file
    ? file.type === "application/pdf"
    : isPdfUrl(url, fileKey);

  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-3">
      <p className="text-sm font-medium">
        {title}
        {optional ? (
          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
            Opcional
          </span>
        ) : null}
      </p>
      {previewUrl ? (
        pdf ? (
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="block rounded-lg border border-dashed border-border bg-muted/40 px-3 py-8 text-center text-sm text-sky-700 underline"
          >
            Ver PDF
          </a>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={title}
            className="h-40 w-full rounded-lg border border-border object-contain bg-muted/30"
          />
        )
      ) : (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-xs text-muted-foreground">
          Sin documento
        </div>
      )}
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-muted/50">
        <CloudUpload className="size-4" />
        {file ? file.name : "Subir / reemplazar"}
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          className="sr-only"
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            onChange(e.target.files?.[0] ?? null);
          }}
        />
      </label>
    </div>
  );
}
