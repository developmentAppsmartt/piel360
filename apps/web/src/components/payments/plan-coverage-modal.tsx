"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Info,
  Microscope,
  ScanFace,
  Shield,
} from "lucide-react";
import {
  coverageHasItems,
  parsePlanCoverage,
  providerSlugMatches,
  type Plan,
  type PlanCoverage,
  type PlanCoverageItem,
} from "@piel360/shared";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function sanitizeLite(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "");
}

function planProviderSlugs(plan: Plan): string[] {
  if (plan.providers?.length) return plan.providers.map((p) => p.slug);
  return [plan.provider.slug];
}

function resolveCoverageVariant(
  plan: Plan,
  coverage: PlanCoverage,
): "aesthetic" | "dermatology" {
  const slugs = planProviderSlugs(plan);
  const hasSkiniver = slugs.some((slug) =>
    providerSlugMatches(slug, ["skiniver"]),
  );
  const hasAesthetic = slugs.some((slug) =>
    providerSlugMatches(slug, ["youcam", "fitzpatrick"]),
  );

  if (hasSkiniver && !hasAesthetic) return "dermatology";
  if (hasAesthetic && !hasSkiniver) return "aesthetic";

  const hasDermCoverage =
    coverage.dermatologyClasses.length > 0 ||
    coverage.dermatologyDiseases.length > 0;
  const hasAestheticCoverage = coverage.aesthetic.length > 0;

  if (hasDermCoverage && !hasAestheticCoverage) return "dermatology";
  return "aesthetic";
}

function AestheticList({
  items,
  html,
}: {
  items: PlanCoverageItem[];
  html?: string;
}) {
  if (html?.trim()) {
    return (
      <div
        className="space-y-1 text-sm leading-relaxed text-muted-foreground [&_p]:my-1.5 [&_strong]:font-semibold [&_strong]:text-primary [&_ul]:list-disc [&_ul]:pl-5 [&_em]:italic"
        dangerouslySetInnerHTML={{ __html: sanitizeLite(html) }}
      />
    );
  }
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Este plan aún no tiene condiciones de cobertura configuradas.
      </p>
    );
  }
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item.key} className="flex items-start gap-2.5 text-sm">
          <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-3 stroke-[3]" />
          </span>
          <span>
            <span className="font-semibold text-primary">{item.label}</span>
            {item.description ? (
              <span className="text-muted-foreground">
                : {item.description.replace(/\.$/, "")}.
              </span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

function DermModalBody({ coverage }: { coverage: PlanCoverage }) {
  const classItems = coverage.dermatologyClasses;
  const diseaseItems = coverage.dermatologyDiseases;
  const hasAny = classItems.length > 0 || diseaseItems.length > 0;

  if (!hasAny) {
    return (
      <p className="text-sm text-muted-foreground">
        Este plan aún no tiene condiciones de cobertura configuradas.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {classItems.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
            <Microscope className="size-4" />
            Clases de enfermedades y condiciones incluidas
          </div>
          {coverage.dermatologyClassesHtml?.trim() ? (
            <div
              className="text-sm leading-relaxed text-muted-foreground [&_p]:my-1 [&_strong]:font-semibold [&_strong]:text-primary [&_ul]:list-disc [&_ul]:pl-5 [&_em]:italic"
              dangerouslySetInnerHTML={{
                __html: sanitizeLite(coverage.dermatologyClassesHtml),
              }}
            />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {classItems.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center gap-2 rounded-full border border-primary/20 bg-white px-3 py-2 text-sm font-medium text-primary"
                >
                  <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Microscope className="size-3.5" />
                  </span>
                  <span className="truncate">{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {diseaseItems.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
            <Shield className="size-4" />
            Análisis de apoyo diagnóstico incluidos
          </div>
          {coverage.dermatologyDiseasesHtml?.trim() ? (
            <div
              className="text-sm leading-relaxed text-muted-foreground [&_p]:my-1 [&_strong]:font-semibold [&_strong]:text-primary [&_ul]:list-disc [&_ul]:pl-5 [&_em]:italic"
              dangerouslySetInnerHTML={{
                __html: sanitizeLite(coverage.dermatologyDiseasesHtml),
              }}
            />
          ) : (
            <ul className="space-y-2">
              {diseaseItems.map((item) => (
                <li key={item.key} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3 stroke-[3]" />
                  </span>
                  <span>
                    <span className="font-semibold text-primary">{item.label}</span>
                    {item.description ? (
                      <span className="text-muted-foreground">
                        . {item.description.replace(/\.$/, "")}.
                      </span>
                    ) : (
                      "."
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}

export function PlanCoverageModal({
  open,
  onOpenChange,
  coverage,
  planName,
  variant,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coverage: PlanCoverage;
  planName: string;
  variant: "aesthetic" | "dermatology";
}) {
  const isDerm = variant === "dermatology";
  const Icon = isDerm ? Microscope : ScanFace;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-start gap-3 text-base text-primary">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
              <Icon className="size-5" />
            </span>
            <span className="space-y-1">
              <span className="block font-bold leading-snug">
                Condiciones de la piel que cubre el plan
              </span>
              <span className="block text-xs font-normal text-primary/80">
                {isDerm
                  ? "Este plan incluye el análisis de las siguientes clases de enfermedades y condiciones de la piel mediante análisis de apoyo diagnóstico."
                  : "Este plan incluye el análisis de las siguientes condiciones de la piel:"}
              </span>
              <span className="block text-[11px] font-normal text-muted-foreground">
                {planName}
              </span>
            </span>
          </DialogTitle>
        </DialogHeader>

        {isDerm ? (
          <DermModalBody coverage={coverage} />
        ) : (
          <AestheticList
            items={coverage.aesthetic}
            html={coverage.aestheticHtml}
          />
        )}

        <div className="mt-1 flex gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs leading-relaxed text-primary/90">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            {isDerm
              ? "El plan de análisis dermatológico Piel 360 permite un diagnóstico más preciso y una mejor toma de decisiones clínicas, utilizando tecnología de inteligencia artificial y análisis de imágenes."
              : "El análisis se realiza mediante inteligencia artificial, utilizando imágenes y algoritmos avanzados para ofrecer un diagnóstico preciso y personalizado."}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Botón circular del header de la card: abre el modal de cobertura. */
export function PlanCoverageIconButton({
  plan,
  className,
  accentHex,
}: {
  plan: Plan;
  className?: string;
  /** Color del plan (headerColor); pinta fondo e icono. */
  accentHex?: string;
}) {
  const [open, setOpen] = useState(false);
  const coverage = useMemo(
    () => parsePlanCoverage(plan.coverage),
    [plan.coverage],
  );
  const hasCoverage = coverageHasItems(coverage);
  const variant = resolveCoverageVariant(plan, coverage);
  const Icon = variant === "dermatology" ? Microscope : ScanFace;
  const accentStyle = accentHex
    ? {
        backgroundColor: accentHex,
        borderColor: accentHex,
        color: "#fff",
      }
    : undefined;

  if (!hasCoverage) {
    return (
      <span
        className={cn(
          "inline-flex size-12 items-center justify-center rounded-full border-2 border-primary/20 bg-primary text-primary-foreground shadow-sm",
          className,
        )}
        style={accentStyle}
        aria-hidden
      >
        <Icon className="size-6" />
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label="Ver condiciones que cubre el plan"
        onClick={() => setOpen(true)}
        onMouseEnter={() => setOpen(true)}
        className={cn(
          "inline-flex size-12 items-center justify-center rounded-full border-2 border-primary/30 bg-primary text-primary-foreground shadow-sm transition hover:scale-105 hover:border-primary",
          className,
        )}
        style={accentStyle}
      >
        <Icon className="size-6" />
      </button>
      <PlanCoverageModal
        open={open}
        onOpenChange={setOpen}
        coverage={coverage}
        planName={plan.name}
        variant={variant}
      />
    </>
  );
}

export type { PlanCoverage };
