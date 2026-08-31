import { cookies } from "next/headers";
import { apiFetch } from "@/lib/api";

/** Permisos RBAC vigentes en BD (no los del JWT en caché). */
export async function fetchUserPermissions(accessToken: string): Promise<string[]> {
  const data = await apiFetch<{ permissions: string[] }>("/auth/me/permissions", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data.permissions ?? [];
}

export async function fetchUserPermissionsFromCookies(): Promise<string[] | null> {
  const token = (await cookies()).get("piel360_token")?.value;
  if (!token) return null;
  try {
    return await fetchUserPermissions(token);
  } catch {
    return null;
  }
}
