import { useWatch, type UseFormSetValue } from "react-hook-form";
import { Controller } from "react-hook-form";
import { FormSection, YesNoToggle } from "@/components/patients/patient-form-fields";
import type { PatientFormValues } from "@/components/patients/patient-form-schema";
import { Button } from "@/components/ui/button";
import type { ClinicalHistoryGroups } from "@/lib/queries/patient-clinical-history";
import { ClinicalText, type ClinicalControl } from "./clinical-fields";

/** «Seguridad y antecedentes clínicos» y «Antecedentes familiares»: las
 * preguntas salen del catálogo del API, no se repiten aquí. */
export function ClinicalChecklistSection({
  control,
  setValue,
  groups,
}: {
  control: ClinicalControl;
  setValue: UseFormSetValue<PatientFormValues>;
  groups: ClinicalHistoryGroups;
}) {
  const answers = useWatch({ control, name: "clinical.answers" });
  const pendingKeys = Object.entries(answers ?? {})
    .filter(([, answer]) => answer === null)
    .map(([key]) => key);

  function markPendingAsNo() {
    for (const key of pendingKeys) {
      setValue(`clinical.answers.${key}`, false, { shouldDirty: true });
    }
  }

  return (
    <FormSection
      title="Seguridad y antecedentes clínicos"
      description="Marca Sí o No en cada punto — toma menos de un minuto."
    >
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/30 px-3 py-2">
        <p className="text-xs text-muted-foreground">
          {pendingKeys.length
            ? `${pendingKeys.length} sin responder`
            : "Todas las preguntas respondidas"}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pendingKeys.length === 0}
          onClick={markPendingAsNo}
        >
          Marcar pendientes como No
        </Button>
      </div>

      {groups.map((group) => (
        <div key={group.key}>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {group.label}
          </p>
          <div>
            {group.items.map((item) => (
              <Controller
                key={item.key}
                name={`clinical.answers.${item.key}`}
                control={control}
                render={({ field }) => (
                  <YesNoToggle
                    label={item.label}
                    value={field.value ?? null}
                    onChange={field.onChange}
                  />
                )}
              />
            ))}
          </div>
          {group.key === "aesthetic" ? (
            <div className="pt-2">
              <ClinicalText
                control={control}
                field="aestheticHistoryDetail"
                label="Detalle (opcional)"
                placeholder="Tipo de tratamiento y fecha aproximada"
              />
            </div>
          ) : null}
        </div>
      ))}
    </FormSection>
  );
}
