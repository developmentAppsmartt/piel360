import { FormSection } from "@/components/patients/patient-form-fields";
import { ClinicalChips, ClinicalText, type ClinicalControl } from "./clinical-fields";

export function LifestyleSection({ control }: { control: ClinicalControl }) {
  return (
    <FormSection
      title="Hábitos y estilo de vida"
      description="Lo que el día a día le hace a la piel."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <ClinicalChips control={control} field="smoking" label="Tabaquismo" />
        <ClinicalChips control={control} field="alcohol" label="Consumo de alcohol" />
        <ClinicalChips control={control} field="sleepQuality" label="Calidad de sueño" />
        <ClinicalChips control={control} field="stressLevel" label="Nivel de estrés" />
      </div>

      <div className="space-y-4 rounded-2xl border border-border/70 bg-muted/20 p-4">
        <p className="text-sm font-semibold text-foreground">
          Antecedentes ginecológicos{" "}
          <span className="text-xs font-normal text-muted-foreground">(cuando corresponda)</span>
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <ClinicalChips control={control} field="menopause" label="Menopausia" />
          <ClinicalChips control={control} field="pcos" label="Trastornos hormonales (SOP)" />
        </div>
        <ClinicalText
          control={control}
          field="contraceptiveMethod"
          label="Método anticonceptivo actual (opcional)"
          placeholder="Ej. DIU, pastilla, ninguno"
        />
      </div>
    </FormSection>
  );
}
