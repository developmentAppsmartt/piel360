"use server";

import { redirect } from "next/navigation";
import { isDoctorVerificationActive, type Role } from "@piel360/shared";
import { ApiError, apiFetch } from "@/lib/api";
import { clearSessionCookies, setSessionCookies } from "@/lib/session";

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: Role;
    verificationStatus?: string;
  };
}

export interface AuthActionState {
  error?: string;
}

const PANEL_HOME: Record<Role, string> = {
  superadmin: "/admin",
  monitor: "/admin",
  doctor: "/doctor/home",
  patient: "/patient/dashboard",
};

function homeForUser(user: AuthResponse["user"]): string {
  if (user.role === "monitor") return "/admin/verificacion";
  if (
    user.role === "doctor" &&
    !isDoctorVerificationActive(user.verificationStatus)
  ) {
    return "/doctor/planes";
  }
  return PANEL_HOME[user.role] ?? PANEL_HOME.doctor;
}

/** Se usa con .bind(null, role) desde cada <LoginForm role="..."> (MIGRACION.md §2.2). */
export async function loginAction(
  _role: Role,
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  let result: AuthResponse;
  try {
    result = await apiFetch<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    return { error: "No se pudo conectar con el servidor." };
  }

  await setSessionCookies(result.accessToken, result.refreshToken);
  redirect(homeForUser(result.user));
}

/** Admin no tiene auto-registro (MIGRACION.md §2.2) — solo doctor/patient. */
export async function registerAction(
  role: "doctor" | "patient",
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const firstName = String(formData.get("firstName") ?? "");
  const lastName = String(formData.get("lastName") ?? "");
  const phone = String(formData.get("phone") ?? "");
  const phoneTicket = String(formData.get("phoneTicket") ?? "");
  const membershipType = String(formData.get("membershipType") ?? "solo_doctor");

  const body: Record<string, string> = {
    email,
    password,
    firstName,
    lastName,
    phone,
    phoneTicket,
  };
  if (role === "doctor") {
    body.membershipType = membershipType;
  }

  let result: AuthResponse;
  try {
    result = await apiFetch<AuthResponse>(`/auth/register/${role}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    return { error: "No se pudo conectar con el servidor." };
  }

  await setSessionCookies(result.accessToken, result.refreshToken);
  redirect(homeForUser(result.user));
}

/** Registro doctor con perfil profesional, ubicación y documentos opcionales. */
export async function registerDoctorExtendedAction(
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const firstName = String(formData.get("firstName") ?? "");
  const lastName = String(formData.get("lastName") ?? "");
  const phone = String(formData.get("phone") ?? "");
  const membershipType = String(formData.get("membershipType") ?? "solo_doctor");
  const docType = String(formData.get("docType") ?? "");
  const docNumber = String(formData.get("docNumber") ?? "");
  const birthDate = String(formData.get("birthDate") ?? "");
  const gender = String(formData.get("gender") ?? "");
  const specialty = String(formData.get("specialty") ?? "");
  const medicalRegistry = String(formData.get("medicalRegistry") ?? "");
  const licenseNumber = String(formData.get("licenseNumber") ?? "");
  const educationEntity = String(formData.get("educationEntity") ?? "");
  const graduationInstitution = String(
    formData.get("graduationInstitution") ?? "",
  );
  const address = String(formData.get("address") ?? "");
  const city = String(formData.get("city") ?? "");
  const country = String(formData.get("country") ?? "");
  const latRaw = String(formData.get("lat") ?? "");
  const lngRaw = String(formData.get("lng") ?? "");
  const lat = latRaw ? Number(latRaw) : undefined;
  const lng = lngRaw ? Number(lngRaw) : undefined;

  let result: AuthResponse;
  try {
    result = await apiFetch<AuthResponse>("/auth/register/doctor", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        firstName,
        lastName,
        phone,
        membershipType,
        docType: docType || undefined,
        docNumber: docNumber || undefined,
        birthDate: birthDate || undefined,
        gender: gender || undefined,
        specialty: specialty || undefined,
        medicalRegistry: medicalRegistry || undefined,
        licenseNumber: licenseNumber || undefined,
        educationEntity: educationEntity || undefined,
        graduationInstitution: graduationInstitution || undefined,
        address: address || undefined,
        city: city || undefined,
        country: country || undefined,
        lat: Number.isFinite(lat) ? lat : undefined,
        lng: Number.isFinite(lng) ? lng : undefined,
      }),
    });
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    return { error: "No se pudo conectar con el servidor." };
  }

  const cedula = formData.get("cedula");
  const medicalRegistryDoc = formData.get("medicalRegistryDoc");
  const diploma = formData.get("diploma");
  const hasDocs =
    cedula instanceof File ||
    medicalRegistryDoc instanceof File ||
    diploma instanceof File;

  if (hasDocs) {
    const docs = new FormData();
    if (cedula instanceof File && cedula.size > 0) docs.set("cedula", cedula);
    if (medicalRegistryDoc instanceof File && medicalRegistryDoc.size > 0) {
      docs.set("medicalRegistryDoc", medicalRegistryDoc);
    }
    if (diploma instanceof File && diploma.size > 0) docs.set("diploma", diploma);
    try {
      await apiFetch("/doctors/me/documents", {
        method: "POST",
        headers: { Authorization: `Bearer ${result.accessToken}` },
        body: docs,
      });
    } catch {
      // La cuenta ya se creó; no bloqueamos el acceso por fallo de documentos.
    }
  }

  await setSessionCookies(result.accessToken, result.refreshToken);
  redirect(homeForUser(result.user));
}

export async function logoutAction() {
  await clearSessionCookies();
  redirect("/");
}
