"use client";

import type { ReactNode } from "react";
import type { LeadInterest, LeadIntent } from "@piel360/shared";

/** Lo que un botón de la página deja preelegido en el formulario. */
export type LeadPreset = {
  interest?: LeadInterest;
  intent?: LeadIntent;
  planId?: string;
};

export const LEAD_PRESET_EVENT = "piel360:lead-preset";
export const LEAD_FORM_ID = "contacto";

/** Enlace a `#contacto` que además preelige servicio, intención o plan. Sin
 * JS sigue siendo un ancla normal. */
export function LeadCta({
  preset,
  className,
  children,
}: {
  preset?: LeadPreset;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={`#${LEAD_FORM_ID}`}
      className={className}
      onClick={() => {
        if (preset) {
          window.dispatchEvent(new CustomEvent<LeadPreset>(LEAD_PRESET_EVENT, { detail: preset }));
        }
      }}
    >
      {children}
    </a>
  );
}
