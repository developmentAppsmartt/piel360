import type { MembershipType } from "@piel360/shared";
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
  membershipType: MembershipType;
  docType?: string;
  docNumber?: string;
  birthDate?: string;
  gender?: string;
  specialty?: string;
  medicalRegistry?: string;
  licenseNumber?: string;
  educationEntity?: string;
  graduationInstitution?: string;
  address?: string;
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
}

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface DoctorRegisterDocuments {
  cedula?: File | null;
  medicalRegistryDoc?: File | null;
  diploma?: File | null;
}

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

  const { cedula, medicalRegistryDoc, diploma } = documents;
  const hasDocs =
    (cedula && cedula.size > 0) ||
    (medicalRegistryDoc && medicalRegistryDoc.size > 0) ||
    (diploma && diploma.size > 0);

  if (!hasDocs) {
    return { result };
  }

  const docs = new FormData();
  if (cedula && cedula.size > 0) docs.set("cedula", cedula);
  if (medicalRegistryDoc && medicalRegistryDoc.size > 0) {
    docs.set("medicalRegistryDoc", medicalRegistryDoc);
  }
  if (diploma && diploma.size > 0) docs.set("diploma", diploma);

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
