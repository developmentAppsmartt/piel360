import type { MembershipType } from "@piel360/shared";
import { ApiError } from "@/lib/api-error";
import { apiClientFetch } from "@/lib/api-client";
import type { AuthUser } from "@/lib/auth-redirect";

export interface EmpresaRegisterPayload {
  email: string;
  password: string;
  phone: string;
  phoneTicket?: string;
  membershipType: Extract<MembershipType, "empresa" | "empresa_aliada">;
  organizationName: string;
  ciiuCode?: string;
  businessEmail?: string;
  businessPhone?: string;
  website?: string;
  employeeCountRange?: string;
  legalRepName: string;
  legalRepDocType?: string;
  legalRepDocNumber: string;
  address: string;
  city?: string;
  department?: string;
  country?: string;
  lat?: number;
  lng?: number;
}

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface EmpresaRegisterDocuments {
  legalRepCedula?: File | null;
  rut?: File | null;
  existenceCert?: File | null;
}

export async function registerEmpresaWithDocuments(
  payload: EmpresaRegisterPayload,
  documents: EmpresaRegisterDocuments,
): Promise<{ result: AuthTokensResponse; docUploadError?: string }> {
  const result = await apiClientFetch<AuthTokensResponse>("/auth/register/empresa", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const { legalRepCedula, rut, existenceCert } = documents;
  const hasDocs =
    (legalRepCedula && legalRepCedula.size > 0) ||
    (rut && rut.size > 0) ||
    (existenceCert && existenceCert.size > 0);

  if (!hasDocs) return { result };

  const docs = new FormData();
  if (legalRepCedula && legalRepCedula.size > 0) {
    docs.set("legalRepCedula", legalRepCedula);
  }
  if (rut && rut.size > 0) docs.set("rut", rut);
  if (existenceCert && existenceCert.size > 0) docs.set("existenceCert", existenceCert);

  try {
    await apiClientFetch("/organizations/me/documents", {
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
