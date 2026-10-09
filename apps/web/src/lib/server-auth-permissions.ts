import { cookies } from "next/headers";
import type { AccountStatus } from "@piel360/shared";
import { apiFetch } from "@/lib/api";

type MePermissionsResponse = { permissions: string[]; account?: AccountStatus };

async function fetchMePermissions(accessToken: string): Promise<MePermissionsResponse> {
  return apiFetch<MePermissionsResponse>("/auth/me/permissions", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

/** Permisos RBAC vigentes en BD (no los del JWT en caché). */
export async function fetchUserPermissions(accessToken: string): Promise<string[]> {
  const data = await fetchMePermissions(accessToken);
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

/** Permisos + estado de la cuenta (deshabilitada / sin plan) en una sola llamada. */
export async function fetchSessionStateFromCookies(): Promise<{
  permissions: string[] | null;
  account: AccountStatus | null;
}> {
  const token = (await cookies()).get("piel360_token")?.value;
  if (!token) return { permissions: null, account: null };
  try {
    const data = await fetchMePermissions(token);
    return { permissions: data.permissions ?? [], account: data.account ?? null };
  } catch {
    return { permissions: null, account: null };
  }
}
