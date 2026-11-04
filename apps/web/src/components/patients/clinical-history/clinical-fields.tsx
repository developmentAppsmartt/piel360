import { Controller, type Control } from "react-hook-form";
import {
  CLINICAL_OPTIONS,
  CLINICAL_TEXT_MAX_LENGTH,
  type ClinicalOptionField,
  type ClinicalTextField,
} from "@piel360/shared";
import {
  ChipGroup,
  FormField,
  inputClass,
  textareaClass,
} from "@/components/patients/patient-form-fields";
import type { PatientFormValues } from "@/components/patients/patient-form-schema";

export type ClinicalControl = Control<PatientFormValues>;

export function ClinicalText({
  control,
  field,
  label,
  placeholder,
  multiline = false,
}: {
  control: ClinicalControl;
  field: ClinicalTextField;
  label: string;
  placeholder?: string;
  multiline?: boolean;
}) {
  const id = `clinical-${field}`;
  return (
    <Controller
      name={`clinical.profile.${field}`}
      control={control}
      render={({ field: input, fieldState }) => (
        <FormField label={label} id={id} error={fieldState.error?.message}>
          {multiline ? (
            <textarea
              id={id}
              rows={3}
              maxLength={CLINICAL_TEXT_MAX_LENGTH}
              placeholder={placeholder}
              className={textareaClass}
              {...input}
              value={input.value ?? ""}
            />
          ) : (
            <input
              id={id}
              maxLength={CLINICAL_TEXT_MAX_LENGTH}
              placeholder={placeholder}
              className={inputClass}
              {...input}
              value={input.value ?? ""}
            />
          )}
        </FormField>
      )}
    />
  );
}

export function ClinicalChips({
  control,
  field,
  label,
}: {
  control: ClinicalControl;
  field: ClinicalOptionField;
  label: string;
}) {
  return (
    <FormField label={label}>
      <Controller
        name={`clinical.profile.${field}`}
        control={control}
        render={({ field: input }) => (
          <ChipGroup
            options={CLINICAL_OPTIONS[field]}
            value={input.value ?? ""}
            onChange={input.onChange}
          />
        )}
      />
    </FormField>
  );
}
