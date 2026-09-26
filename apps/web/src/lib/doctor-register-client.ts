import { ApiError } from "@/lib/api-error";
import { apiClientFetch } from "@/lib/api-client";
import type { AuthUser } from "@/lib/auth-redirect";

export interface DoctorRegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  /** Ticket de `POST /auth/otp/phone/verify` — confirma que el celular fue verificado. */
  phoneTicket?: string;
  /** Ticket de `POST /auth/otp/verify` (purpose=register) — confirma que el correo fue verificado. */
  emailTicket?: string;
  membershipType?: "solo_doctor";
  docType?: string;
  docNumber?: string;
  birthDate?: string;
  gender?: string;
  specialty: string;
  /** Qué formulario llenó: define qué campos y documentos le corresponden. */
  professionalKind?: "specialty" | "labor";
  /** Solo especialidad médica. */
  medicalRegistry?: string;
  /** Entidad educativa de pregrado (solo especialidad médica). */
  educationEntity?: string;
  /** Entidad educativa de postgrado / especialización médica — opcional. */
  graduationInstitution?: string;
  /** Solo técnicos laborales — institución de educación para el trabajo. */
  technicalInstitution?: string;
  address?: string;
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
  /** Código de empresa aliada (registro vía URL/QR). */
  referralCode?: string;
}

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

/** Claves del FormData de `POST /doctors/me/documents` — ver doctor-documents.ts. */
export type DoctorRegisterDocuments = Partial<Record<string, File | null>>;

/**
 * Registro doctor desde el navegador → API directa (multipart).
 * Evita pasar archivos por Server Actions de Next.js (límite ~1 MB → 413).
 */
export async function registerDoctorWithDocuments(
  payload: DoctorRegisterPayload,
  documents: DoctorRegisterDocuments,
): Promise<{ result: AuthTokensResponse; docUploadError?: string }> {
  const result = await apiClientFetch<AuthTokensResponse>("/auth/register/doctor", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const hasDocs = Object.values(documents).some((f) => f && f.size > 0);
  if (!hasDocs) {
    return { result };
  }

  const docs = new FormData();
  for (const [field, file] of Object.entries(documents)) {
    if (file && file.size > 0) docs.set(field, file);
  }

  try {
    await apiClientFetch("/doctors/me/documents", {
      method: "POST",
      headers: { Authorization: `Bearer ${result.accessToken}` },
      body: docs,
    });
  } catch (err) {
    const message =
      err instanceof ApiError
        ? err.message
        : "No se pudieron subir los documentos.";
    return {
      result,
      docUploadError: `${message} Tu cuenta se creó; puedes subirlos en Configuración.`,
    };
  }

  return { result };
}
