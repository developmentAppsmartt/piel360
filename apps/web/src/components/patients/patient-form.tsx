"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, Controller } from "react-hook-form";
import type { PatientClinicalHistory } from "@piel360/shared";
import { AddressLocationPicker } from "@/components/maps";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-error";
import { PATIENT_BIRTH_TYPE_OPTIONS, PATIENT_DOC_TYPES, PATIENT_GENDER_OPTIONS } from "@/lib/patient-form-options";
import {
  useClinicalHistoryCatalog,
  usePatientClinicalHistory,
  useSavePatientClinicalHistory,
  type ClinicalHistoryGroups,
} from "@/lib/queries/patient-clinical-history";
import type { Patient, PatientInput } from "@/lib/queries/patients";
import { chronologicalAgeYears } from "@/lib/skin-age";
import { ClinicalChecklistSection } from "./clinical-history/clinical-checklist-section";
import { ConsultationSection } from "./clinical-history/consultation-section";
import { ExpectationsConsentSection } from "./clinical-history/expectations-consent-section";
import { HealthBackgroundSection } from "./clinical-history/health-background-section";
import { LifestyleSection } from "./clinical-history/lifestyle-section";
import { PatientAppAccessSection } from "./patient-app-access-section";
import { PatientDermatologySection } from "./patient-dermatology-section";
import { ChipGroup, FormField, FormSection, inputClass } from "./patient-form-fields";
import {
  createPatientSchema,
  patientFormDefaults,
  toClinicalInput,
  toPatientInput,
  type PatientFormValues,
} from "./patient-form-schema";

type PatientFormProps = {
  defaultValues?: Patient;
  /** Guarda el paciente (POST o PATCH) y lo devuelve; la historia clínica se
   * guarda después con su id. */
  onSubmit: (input: PatientInput) => Promise<Patient>;
  /** Paciente e historia guardados. */
  onSaved: (patient: Patient) => void;
  /** Solo en el alta: el paciente ya existe pero la historia no se guardó.
   * La página lo lleva a editarlo para no crearlo dos veces. */
  onHistoryFailed?: (patient: Patient, message: string) => void;
  submitLabel: string;
  onCancel?: () => void;
};

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError) {
    return Array.isArray(err.message) ? err.message.join(", ") : err.message;
  }
  return err instanceof Error ? err.message : fallback;
}

/** La historia clínica se carga antes de montar el formulario: así entra en
 * los valores iniciales y no hay que copiarla en un efecto. */
export function PatientForm(props: PatientFormProps) {
  const isCreate = !props.defaultValues;
  const history = usePatientClinicalHistory(props.defaultValues?.id);
  const catalog = useClinicalHistoryCatalog(isCreate);
  const loading = isCreate ? catalog.isPending : history.isPending;
  const failed = isCreate ? catalog.isError : history.isError;

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando historia clínica…</p>;
  }
  if (failed) {
    return (
      <p className="text-sm text-destructive">No se pudo cargar la historia clínica del paciente.</p>
    );
  }
  return (
    <PatientFormBody
      {...props}
      history={history.data}
      groups={history.data?.groups ?? catalog.data ?? []}
    />
  );
}

function PatientFormBody({
  defaultValues,
  onSubmit,
  onSaved,
  onHistoryFailed,
  submitLabel,
  onCancel,
  history,
  groups,
}: PatientFormProps & {
  history: PatientClinicalHistory | undefined;
  groups: ClinicalHistoryGroups;
}) {
  const isCreate = !defaultValues;
  const saveHistory = useSavePatientClinicalHistory();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(createPatientSchema(isCreate)),
    defaultValues: patientFormDefaults(defaultValues, history, groups),
  });

  const [birthDateValue, addressValue, latValue, lngValue] = useWatch({
    control,
    name: ["birthDate", "address", "lat", "lng"],
  });
  const chronologicalAge = chronologicalAgeYears(birthDateValue || null, new Date());

  const submit = handleSubmit(async (values) => {
    let saved: Patient;
    try {
      saved = await onSubmit(toPatientInput(values, isCreate));
    } catch (err) {
      setError("root", { message: errorMessage(err, "No se pudo guardar el paciente.") });
      return;
    }
    try {
      await saveHistory.mutateAsync({ patientId: saved.id, input: toClinicalInput(values) });
    } catch (err) {
      const message = `${
        isCreate ? "El paciente se creó" : "Los datos del paciente se guardaron"
      }, pero no se pudo guardar la historia clínica: ${errorMessage(err, "inténtalo de nuevo")}`;
      if (isCreate && onHistoryFailed) onHistoryFailed(saved, message);
      else setError("root", { message });
      return;
    }
    onSaved(saved);
  });

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-6">
      <FormSection
        title="Datos personales"
        description="Información de identificación y contacto básica del paciente."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Nombres" id="firstName" required error={errors.firstName?.message}>
            <input id="firstName" className={inputClass} {...register("firstName")} />
          </FormField>
          <FormField label="Apellidos" id="lastName" required error={errors.lastName?.message}>
            <input id="lastName" className={inputClass} {...register("lastName")} />
          </FormField>
        </div>

        <FormField label="Tipo de identificación" id="docType" required error={errors.docType?.message}>
          <Controller
            name="docType"
            control={control}
            render={({ field }) => (
              <ChipGroup
                options={PATIENT_DOC_TYPES.map((d) => ({ value: d, label: d }))}
                value={field.value}
                onChange={field.onChange}
                allowClear={false}
              />
            )}
          />
        </FormField>

        <FormField label="Número de identificación" id="docNumber" required error={errors.docNumber?.message}>
          <input id="docNumber" className={inputClass} {...register("docNumber")} />
        </FormField>

        <FormField label="Sexo" id="gender" required error={errors.gender?.message}>
          <Controller
            name="gender"
            control={control}
            render={({ field }) => (
              <ChipGroup options={PATIENT_GENDER_OPTIONS} value={field.value} onChange={field.onChange} />
            )}
          />
        </FormField>

        <FormField
          label="Fecha de nacimiento"
          id="birthDate"
          required
          hint={
            chronologicalAge != null
              ? `Edad cronológica: ${chronologicalAge} años. Se usa en el análisis de salud de la piel y en el CRM.`
              : "Se usa como edad cronológica en el análisis de salud de la piel y en el CRM."
          }
          error={errors.birthDate?.message}
        >
          <input id="birthDate" type="date" className={inputClass} {...register("birthDate")} />
        </FormField>

        <FormField label="Tipo de nacimiento" id="birthType" required error={errors.birthType?.message}>
          <Controller
            name="birthType"
            control={control}
            render={({ field }) => (
              <ChipGroup options={PATIENT_BIRTH_TYPE_OPTIONS} value={field.value} onChange={field.onChange} />
            )}
          />
        </FormField>
      </FormSection>

      <FormSection
        title="Contacto"
        description="Correo, ubicación en el mapa y teléfono para comunicación con el paciente."
      >
        <FormField
          label="Correo electrónico"
          id="email"
          required
          hint="Correo de contacto del paciente. Si activas “Crear cuenta” más abajo, se usará este mismo correo para iniciar sesión."
          error={errors.email?.message}
        >
          <input id="email" type="email" autoComplete="email" className={inputClass} {...register("email")} />
        </FormField>

        <AddressLocationPicker
          value={{ address: addressValue, lat: latValue, lng: lngValue }}
          onChange={(next) => {
            setValue("address", next.address, { shouldDirty: true });
            setValue("lat", next.lat, { shouldDirty: true });
            setValue("lng", next.lng, { shouldDirty: true });
          }}
        />
        {errors.address?.message ? (
          <p className="text-xs text-destructive">{errors.address.message}</p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-[110px_1fr]">
          <FormField label="Indicativo" id="areaCode" required error={errors.areaCode?.message}>
            <input id="areaCode" className={inputClass} {...register("areaCode")} />
          </FormField>
          <FormField label="Teléfono" id="phone" required error={errors.phone?.message}>
            <input id="phone" type="tel" className={inputClass} {...register("phone")} />
          </FormField>
        </div>
      </FormSection>

      {isCreate ? (
        <PatientAppAccessSection control={control} register={register} errors={errors} />
      ) : null}

      <PatientDermatologySection control={control} register={register} errors={errors} />

      <ConsultationSection control={control} />
      <HealthBackgroundSection control={control} />
      <LifestyleSection control={control} />
      <ClinicalChecklistSection control={control} setValue={setValue} groups={groups} />
      <ExpectationsConsentSection control={control} />

      {errors.root ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {errors.root.message}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" disabled={isSubmitting} className="sm:min-w-40">
          {isSubmitting ? "Guardando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
