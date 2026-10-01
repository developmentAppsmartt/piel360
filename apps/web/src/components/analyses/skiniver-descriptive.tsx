import type {
  SkiniverDescriptiveText,
  SkiniverRiskGuidance,
} from "@piel360/shared";

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

/**
 * El descriptivo que Skiniver manda concatenado en `description`, ya
 * desglosado por el API. Lo comparten la tarjeta del diagnóstico principal y
 * el detalle de cada candidato de apoyo, que tiene el suyo propio.
 */
export function SkiniverDescriptive({
  details,
  icdCode = null,
}: {
  details: SkiniverDescriptiveText;
  icdCode?: string | null;
}) {
  return (
    <>
      <Field label="Descripción" value={details.description} />
      <Field label="Diagnóstico preciso" value={details.precise_diagnosis} />
      <Field label="Tratamiento" value={details.treatment} />
      <Field label="Consejo" value={details.advice} />
      <Field label="Código ICD" value={icdCode} />
    </>
  );
}

export function hasRiskGuidance(risk: SkiniverRiskGuidance | undefined): boolean {
  return Boolean(
    risk && (risk.description || risk.suggestion || risk.short_recommendation),
  );
}

/** Textos que Skiniver manda como claves propias, fuera de `description`. */
export function SkiniverRiskGuidanceBlock({
  risk,
}: {
  risk: SkiniverRiskGuidance;
}) {
  if (!hasRiskGuidance(risk)) return null;
  return (
    <div className="space-y-3 border-t border-border pt-3">
      <p className="text-sm font-semibold">
        {risk.title ?? "Recomendación"}
        {risk.level_title ? (
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {risk.level_title}
          </span>
        ) : null}
      </p>
      <Field label="Qué significa" value={risk.description} />
      <Field label="Seguimiento" value={risk.suggestion} />
      <Field label="Recomendación" value={risk.short_recommendation} />
    </div>
  );
}
