import { FormSection } from "@/components/patients/patient-form-fields";
import { ClinicalChips, ClinicalText, type ClinicalControl } from "./clinical-fields";

export function ConsultationSection({ control }: { control: ClinicalControl }) {
  return (
    <FormSection
      title="Motivo de consulta"
      description="Por qué viene el paciente y cuánto sol recibe."
    >
      <ClinicalText
        control={control}
        field="consultationReason"
        label="Motivo principal de consulta"
        placeholder="Ej. manchas en las mejillas, acné, arrugas…"
        multiline
      />
      <ClinicalChips control={control} field="sunExposure" label="Exposición solar" />
    </FormSection>
  );
}
