"use client";

import { useEffect, useRef } from "react";
import {
  AlignCenter,
  AlignLeft,
  Bold,
  Italic,
  List,
  ListOrdered,
  Underline,
} from "lucide-react";
import { cn } from "@/lib/utils";

const FONTS = [
  { value: "Arial", label: "Arial" },
  { value: "Georgia", label: "Georgia" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Verdana", label: "Verdana" },
  { value: "Trebuchet MS", label: "Trebuchet" },
  { value: "Courier New", label: "Courier" },
] as const;

type SimpleRichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  minHeight?: number;
};

function runCommand(command: string, value?: string) {
  document.execCommand(command, false, value);
}

function normalizeEditorHtml(html: string): string {
  const trimmed = html.trim();
  if (!trimmed || trimmed === "<br>" || trimmed === "<br/>") return "";
  return html;
}

export function SimpleRichTextEditor({
  value,
  onChange,
  placeholder = "Escribe aquí…",
  maxLength = 2000,
  className,
  minHeight = 140,
}: SimpleRichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef(normalizeEditorHtml(value));
  const focused = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const next = value || "";
    // No pisar mientras el usuario escribe; sí sincronizar cambios externos
    // (p. ej. al marcar chips) y el valor inicial.
    if (focused.current && next === lastEmitted.current) return;
    if (el.innerHTML !== next) {
      el.innerHTML = next;
    }
    lastEmitted.current = normalizeEditorHtml(next);
  }, [value]);

  function emit() {
    const el = ref.current;
    if (!el) return;
    const plain = (el.innerText ?? "").replace(/\n$/, "");
    if (plain.length > maxLength) return;
    const html = normalizeEditorHtml(el.innerHTML);
    if (html === lastEmitted.current) return;
    lastEmitted.current = html;
    onChange(html);
  }

  function plainLength() {
    return (ref.current?.innerText ?? "").replace(/\n$/, "").length;
  }

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-background", className)}>
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/30 px-2 py-1.5">
        <select
          aria-label="Tipo de letra"
          className="h-8 rounded-md border border-border bg-background px-2 text-xs outline-none"
          defaultValue="Arial"
          onChange={(e) => {
            ref.current?.focus();
            runCommand("fontName", e.target.value);
            emit();
          }}
        >
          {FONTS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        <ToolbarButton
          label="Negrita"
          onClick={() => {
            ref.current?.focus();
            runCommand("bold");
            emit();
          }}
        >
          <Bold className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Cursiva"
          onClick={() => {
            ref.current?.focus();
            runCommand("italic");
            emit();
          }}
        >
          <Italic className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Subrayado"
          onClick={() => {
            ref.current?.focus();
            runCommand("underline");
            emit();
          }}
        >
          <Underline className="size-3.5" />
        </ToolbarButton>

        <span className="mx-1 h-4 w-px bg-border" aria-hidden />

        <ToolbarButton
          label="Alinear izquierda"
          onClick={() => {
            ref.current?.focus();
            runCommand("justifyLeft");
            emit();
          }}
        >
          <AlignLeft className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Centrar"
          onClick={() => {
            ref.current?.focus();
            runCommand("justifyCenter");
            emit();
          }}
        >
          <AlignCenter className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Lista"
          onClick={() => {
            ref.current?.focus();
            runCommand("insertUnorderedList");
            emit();
          }}
        >
          <List className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Lista numerada"
          onClick={() => {
            ref.current?.focus();
            runCommand("insertOrderedList");
            emit();
          }}
        >
          <ListOrdered className="size-3.5" />
        </ToolbarButton>
      </div>

      <div
        ref={ref}
        role="textbox"
        aria-multiline
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        className={cn(
          "max-h-72 overflow-y-auto px-3 py-2 text-sm outline-none",
          "[&:empty]:before:pointer-events-none [&:empty]:before:text-muted-foreground [&:empty]:before:content-[attr(data-placeholder)]",
          "[&_p]:my-1 [&_strong]:font-semibold [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5",
        )}
        style={{ minHeight }}
        onFocus={() => {
          focused.current = true;
        }}
        onInput={emit}
        onBlur={() => {
          focused.current = false;
          emit();
        }}
      />

      <p className="border-t border-border px-3 py-1.5 text-xs text-muted-foreground">
        Máximo {maxLength} caracteres · {plainLength()}/{maxLength}
      </p>
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}
