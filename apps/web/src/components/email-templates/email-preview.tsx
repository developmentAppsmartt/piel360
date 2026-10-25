"use client";

import { useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { SYSTEM_EMAIL_VARIABLES } from "@piel360/shared";
import { ModuleCard } from "@/components/ui/module-card";
import { cn } from "@/lib/utils";
import type { EmailTemplateVariable } from "@/lib/queries/email-templates";

type PreviewMode = "desktop" | "mobile";

// Mismas claves que usa el envío real (ver `SYSTEM_EMAIL_VARIABLES` en
// @piel360/shared y `ReportEmailService.sendReportReadyEmail` en la API) —
// evita que preview y envío real se desincronicen sobre qué variables existen.
const DEFAULT_PREVIEW_SAMPLES: Record<string, string> = Object.fromEntries(
  SYSTEM_EMAIL_VARIABLES.map((v) => [v.key, v.sampleValue]),
);

export function applyPreviewVars(
  html: string,
  variables: EmailTemplateVariable[] | undefined,
) {
  const samples = { ...DEFAULT_PREVIEW_SAMPLES };
  for (const variable of variables ?? []) {
    if (variable.sampleValue) samples[variable.key] = variable.sampleValue;
  }
  let out = html;
  for (const [key, value] of Object.entries(samples)) {
    out = out.split(key).join(value);
  }
  return out;
}

/**
 * Los enlaces del preview no hacen nada, a propósito. Un `<iframe srcdoc>`
 * hereda la URL base de la página padre, así que el `href="#"` de ejemplo
 * resolvía contra `/doctor/plantillas-correo`: el iframe navegaba al panel
 * sin cookies (está en `sandbox`) y el proxy lo mandaba al login.
 *
 * Las imágenes NO llevan `display:block` aquí: pisaría la alineación que el
 * usuario elige en el editor.
 */
function previewDocument(
  bodyHtml: string,
  variables: EmailTemplateVariable[] | undefined,
) {
  const body = applyPreviewVars(bodyHtml, variables);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
    body{margin:0;padding:16px;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#1a2b3c;}
    a{color:#1E5A9E;pointer-events:none;}
    img{max-width:100%;height:auto;border:0;}
  </style></head><body>${body}</body></html>`;
}

export function EmailPreview({
  bodyHtml,
  subject,
  preheader,
  variables,
  mailConnected,
}: {
  bodyHtml: string;
  subject: string;
  preheader: string;
  variables: EmailTemplateVariable[];
  mailConnected: boolean;
}) {
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">Vista previa del correo</h3>
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          {(
            [
              { id: "desktop", title: "Escritorio", Icon: Monitor },
              { id: "mobile", title: "Móvil", Icon: Smartphone },
            ] as const
          ).map(({ id, title, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setPreviewMode(id)}
              className={cn(
                "rounded-md p-1.5",
                previewMode === id
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground",
              )}
              title={title}
            >
              <Icon className="size-4" />
            </button>
          ))}
        </div>
      </div>

      <ModuleCard className="overflow-hidden p-0">
        <div className="space-y-1 border-b border-border bg-muted/30 px-5 py-3 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">De:</span>{" "}
            {mailConnected
              ? "tu-cuenta@dominio.com"
              : "pendiente · proveedor no conectado"}
          </p>
          <p>
            <span className="font-medium text-foreground">Para:</span>{" "}
            ana@ejemplo.com
          </p>
          <p>
            <span className="font-medium text-foreground">Asunto:</span>{" "}
            {applyPreviewVars(subject, variables)}
          </p>
          {preheader ? (
            <p className="italic">{applyPreviewVars(preheader, variables)}</p>
          ) : null}
        </div>
        <div className="bg-[#f4f7fb] p-4 sm:p-6">
          <div
            className={cn(
              "mx-auto overflow-hidden rounded-xl border border-[#d9e4f2] bg-white shadow-sm",
              previewMode === "mobile" ? "max-w-90" : "max-w-3xl",
            )}
          >
            <iframe
              title="Vista previa del correo"
              srcDoc={previewDocument(bodyHtml, variables)}
              className="block h-140 w-full border-0 bg-white"
              sandbox=""
            />
          </div>
        </div>
      </ModuleCard>
    </div>
  );
}
