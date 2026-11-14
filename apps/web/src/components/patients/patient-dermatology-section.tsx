import { Controller, useWatch, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";
import {
  PATIENT_EXERCISE_DAYS_OPTIONS,
  PATIENT_EXERCISE_DURATION_OPTIONS,
  PATIENT_EXERCISE_HABIT_OPTIONS,
  PATIENT_FITZ_OPTIONS,
  PATIENT_MASCOT_OPTIONS,
  PATIENT_SKIN_OPTIONS,
} from "@/lib/patient-form-options";
import { cn } from "@/lib/utils";
import { ChipGroup, FormField, FormSection, textareaClass } from "./patient-form-fields";
import type { PatientFormValues } from "./patient-form-schema";

type ChipFieldName =
  | "mascotType"
  | "exerciseHabit"
  | "exerciseDaysPerWeek"
  | "exerciseSessionDuration"
  | "skinType";

function ChipField({
  control,
  name,
  label,
  options,
  error,
}: {
  control: Control<PatientFormValues>;
  name: ChipFieldName;
  label: string;
  options: readonly { value: string; label: string }[];
  error?: string;
}) {
  return (
    <FormField label={label} id={name} required error={error}>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <ChipGroup options={options} value={field.value} onChange={field.onChange} />
        )}
      />
    </FormField>
  );
}

export function PatientDermatologySection({
  control,
  register,
  errors,
}: {
  control: Control<PatientFormValues>;
  register: UseFormRegister<PatientFormValues>;
  errors: FieldErrors<PatientFormValues>;
}) {
  const fitz = useWatch({ control, name: "fitzpatrickType" });
  const importantNotesValue = useWatch({ control, name: "importantNotes" });
  const fitzHint = PATIENT_FITZ_OPTIONS.find((f) => f.value === fitz)?.hint;

  return (
    <FormSection
      title="Perfil dermatológico"
      description="Datos que ayudan a personalizar análisis y recomendaciones."
    >
      <ChipField
        control={control}
        name="mascotType"
        label="Mascota en el hogar"
        options={PATIENT_MASCOT_OPTIONS}
        error={errors.mascotType?.message}
      />

      <div className="space-y-4 rounded-2xl border border-border/70 bg-muted/20 p-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Actividad física</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Datos sobre ejercicio o deporte regular.
          </p>
        </div>
        <ChipField
          control={control}
          name="exerciseHabit"
          label="¿Realiza algún tipo de ejercicio o deporte de forma regular?"
          options={PATIENT_EXERCISE_HABIT_OPTIONS}
          error={errors.exerciseHabit?.message}
        />
        <ChipField
          control={control}
          name="exerciseDaysPerWeek"
          label="¿Cuántos días a la semana dedica a estas actividades?"
          options={PATIENT_EXERCISE_DAYS_OPTIONS}
          error={errors.exerciseDaysPerWeek?.message}
        />
        <ChipField
          control={control}
          name="exerciseSessionDuration"
          label="¿Cuánto tiempo dura cada sesión de entrenamiento?"
          options={PATIENT_EXERCISE_DURATION_OPTIONS}
          error={errors.exerciseSessionDuration?.message}
        />
      </div>

      <ChipField
        control={control}
        name="skinType"
        label="Tipo de piel"
        options={PATIENT_SKIN_OPTIONS}
        error={errors.skinType?.message}
      />

      <FormField
        label="Fototipo Fitzpatrick"
        id="fitzpatrickType"
        required
        error={errors.fitzpatrickType?.message}
        hint={fitzHint ?? "Selecciona el tono más cercano al del paciente."}
      >
        <Controller
          name="fitzpatrickType"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-3">
              {PATIENT_FITZ_OPTIONS.map((f) => {
                const active = field.value === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    title={f.hint}
                    aria-label={`Fototipo ${f.value}`}
                    onClick={() => field.onChange(active ? "" : f.value)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-colors",
                      active
                        ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                        : "border-border hover:border-primary/30",
                    )}
                  >
                    <span
                      className="size-9 rounded-full border border-black/10 shadow-inner"
                      style={{ backgroundColor: f.color }}
                    />
                    <span className="text-xs font-medium text-muted-foreground">{f.value}</span>
                  </button>
                );
              })}
            </div>
          )}
        />
      </FormField>

      <FormField
        label="Notas importantes"
        id="importantNotes"
        hint="Opcional. Máximo 500 caracteres."
        error={errors.importantNotes?.message}
      >
        <textarea
          id="importantNotes"
          rows={3}
          maxLength={500}
          className={textareaClass}
          {...register("importantNotes")}
        />
        <p className="text-right text-xs text-muted-foreground">
          {importantNotesValue.length}/500
        </p>
      </FormField>
    </FormSection>
  );
}
