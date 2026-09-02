import type { Role } from "@piel360/shared";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";

/** Roles que pueden iniciar/registrarse con Google OAuth. */
export function googleOAuthRole(
  role: Role,
): "doctor" | "patient" | null {
  if (role === "doctor") return "doctor";
  if (role === "patient") return "patient";
  return null;
}

/** URL de la API que inicia el redirect a Google. */
export function googleAuthStartUrl(role: "doctor" | "patient"): string {
  const params = new URLSearchParams({
    role,
    platform: "web",
  });
  return `${API_URL}/auth/google?${params.toString()}`;
}
