import { FormSection } from "@/components/patients/patient-form-fields";
import { ClinicalChips, ClinicalText, type ClinicalControl } from "./clinical-fields";

export function HealthBackgroundSection({ control }: { control: ClinicalControl }) {
  return (
    <FormSection
      title="Antecedentes y salud"
      description="Cada respuesta da una pieza del rompecabezas."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <ClinicalText
          control={control}
          field="cosmeticRoutine"
          label="Rutina cosmética actual"
          placeholder="Limpiador, protector solar…"
        />
        <ClinicalText
          control={control}
          field="recentProcedures"
          label="Procedimientos recientes"
          placeholder="Ej. peeling hace 2 semanas"
        />
        <ClinicalText
          control={control}
          field="relevantMedication"
          label="Medicación relevante"
          placeholder="Ej. isotretinoína"
        />
        <ClinicalText
          control={control}
          field="knownAllergies"
          label="Alergias conocidas"
          placeholder="Ej. ácido salicílico"
        />
      </div>
      <ClinicalText
        control={control}
        field="dermatologicalHistory"
        label="Antecedentes dermatológicos"
        placeholder="Ej. dermatitis, rosácea…"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <ClinicalChips
          control={control}
          field="frequentSensitivity"
          label="Sensibilidad o reacciones frecuentes"
        />
        <ClinicalChips
          control={control}
          field="pregnancyLactation"
          label="Embarazo / lactancia (cuando corresponda)"
        />
      </div>
    </FormSection>
  );
}
