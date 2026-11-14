"use client";

import { InstitutionField } from "@/components/auth/institution-field";
import { useLaborTechnicianProfiles } from "@/lib/queries/labor-technician-profiles";
import { useSpecialties } from "@/lib/queries/specialties";
import { Field } from "./doc-preview";
import {
  GENDER_OPTIONS,
  inputClass,
  type DoctorProfileFormValues,
  type SetDoctorProfileField,
} from "./doctor-profile-values";

/** Datos personales y profesionales que la cuenta de empresa no tiene. */
export function DoctorProfessionalFields({
  form,
  set,
  professionalKind,
}: {
  form: DoctorProfileFormValues;
  set: SetDoctorProfileField;
  professionalKind: string | null | undefined;
}) {
  const specialtiesQuery = useSpecialties(true);
  const laborProfilesQuery = useLaborTechnicianProfiles(true);
  const medicalSpecialties = specialtiesQuery.data?.map((item) => item.name) ?? [];
  const laborProfiles = laborProfilesQuery.data?.map((item) => item.name) ?? [];
  const professionalProfiles = [...medicalSpecialties, ...laborProfiles];
  const loadingProfiles = specialtiesQuery.isLoading || laborProfilesQuery.isLoading;

  return (
    <>
      <Field label="Género">
        <select
          className={inputClass}
          value={form.gender}
          onChange={(e) => set("gender", e.target.value)}
        >
          <option value="">Seleccionar</option>
          {GENDER_OPTIONS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Fecha de nacimiento">
        <input
          className={inputClass}
          type="date"
          value={form.birthDate}
          onChange={(e) => set("birthDate", e.target.value)}
          max={new Date().toISOString().slice(0, 10)}
        />
      </Field>
      <Field label="Especialidad o perfil profesional">
        <select
          className={inputClass}
          value={form.specialty}
          onChange={(e) => set("specialty", e.target.value)}
          disabled={loadingProfiles || professionalProfiles.length === 0}
        >
          {loadingProfiles ? <option value="">Cargando perfiles…</option> : null}
          {!professionalProfiles.includes(form.specialty) && form.specialty ? (
            <option value={form.specialty}>{form.specialty}</option>
          ) : null}
          {medicalSpecialties.length > 0 ? (
            <optgroup label="Especialidades médicas">
              {medicalSpecialties.map((name) => (
                <option key={`med-${name}`} value={name}>
                  {name}
                </option>
              ))}
            </optgroup>
          ) : null}
          {laborProfiles.length > 0 ? (
            <optgroup label="Técnico laboral">
              {laborProfiles.map((name) => (
                <option key={`lab-${name}`} value={name}>
                  {name}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
      </Field>
      <Field
        label="Registro profesional"
        hint="Registro médico, tarjeta profesional o certificación técnica."
      >
        <input
          className={inputClass}
          value={form.medicalRegistry}
          onChange={(e) => set("medicalRegistry", e.target.value)}
        />
      </Field>
      {/* Mismos campos y etiquetas que el registro, y cada uno con su salida
          a texto libre cuando la institución no está en el catálogo. */}
      {professionalKind === "labor" ? (
        <InstitutionField
          label="Institución educativa técnica"
          otherLabel="Otra institución educativa técnica"
          typeSlug="technical_education_institution"
          placeholder="Busca tu institución técnica"
          value={form.technicalInstitution}
          onChange={(v) => set("technicalInstitution", v)}
        />
      ) : (
        <>
          <InstitutionField
            label="Entidad educativa pregrado"
            otherLabel="Otra institución de pregrado"
            typeSlug="education_entity"
            placeholder="Busca tu universidad"
            value={form.educationEntity}
            onChange={(v) => set("educationEntity", v)}
          />
          <InstitutionField
            label="Entidad educativa postgrado (especialización médica)"
            otherLabel="Otra institución de postgrado"
            typeSlug="education_entity"
            placeholder="Busca la institución de postgrado"
            value={form.graduationInstitution}
            onChange={(v) => set("graduationInstitution", v)}
          />
        </>
      )}
    </>
  );
}
