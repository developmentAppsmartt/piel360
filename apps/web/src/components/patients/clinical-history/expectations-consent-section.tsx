import { Controller } from "react-hook-form";
import { CONSENT_TYPES } from "@piel360/shared";
import { FormSection, YesNoToggle } from "@/components/patients/patient-form-fields";
import { ClinicalChips, ClinicalText, type ClinicalControl } from "./clinical-fields";

export function ExpectationsConsentSection({ control }: { control: ClinicalControl }) {
  return (
    <FormSection
      title="Expectativas y consentimiento"
      description="Último paso antes de iniciar el tratamiento."
    >
      <ClinicalText
        control={control}
        field="expectations"
        label="Expectativas del paciente frente al tratamiento"
        placeholder="Qué espera lograr el paciente…"
        multiline
      />
      <ClinicalChips
        control={control}
        field="recoveryAvailability"
        label="Disponibilidad de tiempo para recuperación"
      />
      <div>
        {CONSENT_TYPES.map((consent) => (
          <Controller
            key={consent.value}
            name={`clinical.consents.${consent.value}`}
            control={control}
            render={({ field }) => (
              <YesNoToggle
                label={consent.label}
                value={field.value ?? null}
                onChange={field.onChange}
              />
            )}
          />
        ))}
      </div>
    </FormSection>
  );
}
