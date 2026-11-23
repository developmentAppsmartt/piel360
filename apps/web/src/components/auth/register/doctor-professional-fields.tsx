"use client";

import { Field, inputClass } from "@/components/auth/auth-form-primitives";
import { InstitutionField } from "@/components/auth/institution-field";
import { useLaborTechnicianProfiles } from "@/lib/queries/labor-technician-profiles";
import { useSpecialties } from "@/lib/queries/specialties";

export type ProfessionalKind = "specialty" | "labor" | "";

export type ProfessionalValues = {
  kind: ProfessionalKind;
  specialty: string;
  laborProfile: string;
  medicalRegistry: string;
  educationEntity: string;
  graduationInstitution: string;
  technicalInstitution: string;
};

export const EMPTY_PROFESSIONAL: ProfessionalValues = {
  kind: "",
  specialty: "",
  laborProfile: "",
  medicalRegistry: "",
  educationEntity: "",
  graduationInstitution: "",
  technicalInstitution: "",
};

/** El primer dato que falta según el tipo de profesional, o null. */
export function professionalError(v: ProfessionalValues): string | null {
  if (!v.kind) return "Elige si eres especialista médico o técnico laboral.";
  if (v.kind === "specialty") {
    if (!v.specialty.trim()) return "Selecciona una especialidad médica.";
    if (!v.medicalRegistry.trim()) return "Ingresa tu registro médico.";
    // El postgrado es opcional: un médico general no tiene especialización.
    if (!v.educationEntity.trim()) return "Indica la entidad educativa de pregrado.";
  }
  if (v.kind === "labor") {
    if (!v.laborProfile.trim()) return "Selecciona un perfil de técnico laboral.";
    if (!v.technicalInstitution.trim()) return "Indica la institución educativa técnica.";
  }
  return null;
}

/** Solo se manda lo que corresponde al tipo elegido: cambiar de tipo a mitad
 * del formulario no deja datos del otro colgando. */
export function professionalPayload(v: ProfessionalValues) {
  const specialty = v.kind === "specialty";
  return {
    specialty: v.kind === "labor" ? v.laborProfile.trim() : v.specialty.trim(),
    professionalKind: v.kind || undefined,
    medicalRegistry: specialty ? v.medicalRegistry.trim() || undefined : undefined,
    educationEntity: specialty ? v.educationEntity.trim() || undefined : undefined,
    graduationInstitution: specialty ? v.graduationInstitution.trim() || undefined : undefined,
    technicalInstitution: v.kind === "labor" ? v.technicalInstitution.trim() || undefined : undefined,
  };
}

const KINDS = [
  { id: "specialty" as const, label: "Especialidad médica" },
  { id: "labor" as const, label: "Técnico laboral" },
];

/** Tipo de profesional y sus datos (especialidad o perfil técnico, registro
 * médico, instituciones). Un técnico laboral no tiene registro médico. */
export function DoctorProfessionalFields({
  value,
  onChange,
}: {
  value: ProfessionalValues;
  onChange: (next: ProfessionalValues) => void;
}) {
  const specialtiesQuery = useSpecialties();
  const laborQuery = useLaborTechnicianProfiles();
  const specialties = specialtiesQuery.data?.map((item) => item.name) ?? [];
  const laborProfiles = laborQuery.data?.map((item) => item.name) ?? [];
  const set = (patch: Partial<ProfessionalValues>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-3 sm:col-span-2">
      <div>
        <p className="text-sm font-medium text-zinc-900">
          Tipo de profesional <span className="text-red-500">*</span>
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Elige una opción. Los análisis disponibles dependen del perfil configurado por el administrador.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {KINDS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`rounded-xl border px-3 py-2.5 text-left text-sm transition ${
              value.kind === option.id
                ? "border-sky-500 bg-sky-50 font-medium text-sky-700"
                : "border-zinc-200 bg-white text-zinc-900 hover:border-sky-300"
            }`}
            onClick={() =>
              set(option.id === "specialty" ? { kind: option.id, laborProfile: "" } : { kind: option.id, specialty: "" })
            }
          >
            {option.label}
          </button>
        ))}
      </div>

      {value.kind === "specialty" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Especialidad" required>
            <select
              className={inputClass}
              value={value.specialty}
              onChange={(e) => set({ specialty: e.target.value })}
              required
              disabled={specialtiesQuery.isLoading || specialties.length === 0}
            >
              <option value="">
                {specialtiesQuery.isLoading ? "Cargando especialidades…" : "Selecciona una especialidad"}
              </option>
              {specialties.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Registro médico" required>
            <input
              className={inputClass}
              placeholder="RM-123456"
              value={value.medicalRegistry}
              onChange={(e) => set({ medicalRegistry: e.target.value })}
              required
            />
          </Field>
          <InstitutionField
            label="Entidad educativa pregrado"
            otherLabel="Otra institución de pregrado"
            typeSlug="education_entity"
            placeholder="Busca tu universidad"
            value={value.educationEntity}
            onChange={(v) => set({ educationEntity: v })}
            required
          />
          <InstitutionField
            label="Entidad educativa postgrado (especialización médica)"
            otherLabel="Otra institución de postgrado"
            typeSlug="education_entity"
            placeholder="Busca la institución de postgrado"
            value={value.graduationInstitution}
            onChange={(v) => set({ graduationInstitution: v })}
          />
        </div>
      ) : null}

      {value.kind === "labor" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Técnico laboral" required>
            <select
              className={inputClass}
              value={value.laborProfile}
              onChange={(e) => set({ laborProfile: e.target.value })}
              required
              disabled={laborQuery.isLoading || laborProfiles.length === 0}
            >
              <option value="">{laborQuery.isLoading ? "Cargando perfiles…" : "Selecciona un técnico laboral"}</option>
              {laborProfiles.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
          <InstitutionField
            label="Institución educativa técnica"
            otherLabel="Otra institución educativa técnica"
            typeSlug="technical_education_institution"
            placeholder="Busca tu institución técnica"
            value={value.technicalInstitution}
            onChange={(v) => set({ technicalInstitution: v })}
            required
          />
        </div>
      ) : null}
    </div>
  );
}
