import { z } from "zod";
import {
  CLINICAL_OPTIONS,
  CLINICAL_TEXT_FIELDS,
  CLINICAL_TEXT_MAX_LENGTH,
  isStrongPassword,
  PASSWORD_STRENGTH_MESSAGE,
  type PatientClinicalHistory,
  type PatientClinicalHistoryInput,
  type PatientClinicalProfile,
} from "@piel360/shared";
import type { ClinicalHistoryGroups } from "@/lib/queries/patient-clinical-history";
import type { Patient, PatientInput } from "@/lib/queries/patients";

const CLINICAL_PROFILE_FIELDS = [
  ...CLINICAL_TEXT_FIELDS,
  ...(Object.keys(CLINICAL_OPTIONS) as (keyof typeof CLINICAL_OPTIONS)[]),
];

const clinicalSchema = z.object({
  // "" = sin dato; al API va como null.
  profile: z.record(
    z.string(),
    z.string().max(
      CLINICAL_TEXT_MAX_LENGTH,
      `Máximo ${CLINICAL_TEXT_MAX_LENGTH} caracteres`,
    ),
  ),
  consents: z.object({
    photos: z.boolean().nullable(),
    informed: z.boolean().nullable(),
  }),
  /** Clave de la pregunta → true (Sí), false (No), null (sin responder). */
  answers: z.record(z.string(), z.boolean().nullable()),
});

export function createPatientSchema(isCreate: boolean) {
  return z
    .object({
      firstName: z.string().min(1, "Requerido"),
      lastName: z.string().min(1, "Requerido"),
      email: z.string().email("Email inválido"),
      password: z.string(),
      createAppAccess: z.boolean(),
      docType: z.string().min(1, "Requerido"),
      docNumber: z.string().min(1, "Requerido"),
      gender: z.string().min(1, "Requerido"),
      address: z.string().min(1, "Requerido"),
      lat: z.number().nullable(),
      lng: z.number().nullable(),
      areaCode: z.string().min(1, "Requerido"),
      phone: z.string().min(1, "Requerido"),
      birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
      mascotType: z.string().min(1, "Requerido"),
      birthType: z.string().min(1, "Requerido"),
      exerciseHabit: z.string().min(1, "Requerido"),
      exerciseDaysPerWeek: z.string().min(1, "Requerido"),
      exerciseSessionDuration: z.string().min(1, "Requerido"),
      skinType: z.string().min(1, "Requerido"),
      fitzpatrickType: z.string().min(1, "Requerido"),
      importantNotes: z.string().max(500, "Máximo 500 caracteres"),
      clinical: clinicalSchema,
    })
    .superRefine((values, ctx) => {
      if (values.lat == null || values.lng == null) {
        ctx.addIssue({
          code: "custom",
          path: ["address"],
          message: "Selecciona una ubicación en el mapa",
        });
      }
      if (!isCreate || !values.createAppAccess) return;
      const password = values.password.trim();
      if (!isStrongPassword(password)) {
        ctx.addIssue({
          code: "custom",
          path: ["password"],
          message: PASSWORD_STRENGTH_MESSAGE,
        });
      }
    });
}

export type PatientFormValues = z.infer<ReturnType<typeof createPatientSchema>>;

function toCoord(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

function opt(v: string): string | undefined {
  const t = v.trim();
  return t ? t : undefined;
}

/** Valores iniciales: un paciente existente con su historia, o el alta en
 * blanco con el catálogo (todas las preguntas sin responder). */
export function patientFormDefaults(
  patient: Patient | undefined,
  history: PatientClinicalHistory | undefined,
  catalog: ClinicalHistoryGroups,
): PatientFormValues {
  const groups = history?.groups ?? catalog;
  return {
    firstName: patient?.firstName ?? "",
    lastName: patient?.lastName ?? "",
    email: patient?.email ?? "",
    password: "",
    createAppAccess: false,
    docType: patient?.docType ?? "CC",
    docNumber: patient?.docNumber ?? "",
    gender: patient?.gender ?? "",
    address: patient?.address ?? "",
    lat: toCoord(patient?.lat),
    lng: toCoord(patient?.lng),
    areaCode: patient?.areaCode ?? "+57",
    phone: patient?.phone ?? "",
    birthDate: toDateInput(patient?.birthDate),
    birthType: patient?.birthType ?? "",
    mascotType: patient?.mascotType ?? "",
    exerciseHabit: patient?.exerciseHabit ?? "",
    exerciseDaysPerWeek: patient?.exerciseDaysPerWeek ?? "",
    exerciseSessionDuration: patient?.exerciseSessionDuration ?? "",
    skinType: patient?.skinType ?? "",
    fitzpatrickType: patient?.fitzpatrickType ?? "",
    importantNotes: patient?.importantNotes ?? "",
    clinical: {
      profile: Object.fromEntries(
        CLINICAL_PROFILE_FIELDS.map((f) => [f, history?.profile[f] ?? ""]),
      ),
      consents: {
        photos: history?.consents.photos ?? null,
        informed: history?.consents.informed ?? null,
      },
      answers: Object.fromEntries(
        groups.flatMap((g) => g.items.map((i) => [i.key, i.answer])),
      ),
    },
  };
}

export function toPatientInput(values: PatientFormValues, isCreate: boolean): PatientInput {
  const includeAccess = isCreate && values.createAppAccess;
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    // Correo de contacto — se manda siempre, no solo al crear cuenta (antes
    // se perdía por completo al editar, ver toInput()/patients.service.ts).
    email: opt(values.email),
    ...(isCreate ? { createAppAccess: values.createAppAccess } : {}),
    ...(includeAccess ? { password: opt(values.password) } : {}),
    docType: opt(values.docType),
    docNumber: opt(values.docNumber),
    gender: opt(values.gender),
    address: opt(values.address),
    ...(values.lat != null && values.lng != null
      ? { lat: values.lat, lng: values.lng }
      : {}),
    areaCode: opt(values.areaCode),
    phone: opt(values.phone),
    birthDate: opt(values.birthDate),
    birthType: opt(values.birthType),
    mascotType: opt(values.mascotType),
    exerciseHabit: opt(values.exerciseHabit),
    exerciseDaysPerWeek: opt(values.exerciseDaysPerWeek),
    exerciseSessionDuration: opt(values.exerciseSessionDuration),
    skinType: opt(values.skinType),
    fitzpatrickType: opt(values.fitzpatrickType),
    importantNotes: opt(values.importantNotes),
  };
}

export function toClinicalInput(values: PatientFormValues): PatientClinicalHistoryInput {
  const { profile, consents, answers } = values.clinical;
  return {
    profile: Object.fromEntries(
      CLINICAL_PROFILE_FIELDS.map((f) => [f, opt(profile[f] ?? "") ?? null]),
    ) as PatientClinicalProfile,
    consents,
    answers,
  };
}
