import { fetchSessionStateFromCookies } from "@/lib/server-auth-permissions";
import { hasAnyPermission } from "@/lib/clinical-panel-permissions";
import { getSession } from "@/lib/session";
import { ConfiguracionShell } from "./config-shell";

export default async function ConfiguracionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const { permissions } = await fetchSessionStateFromCookies();
  const showPersonalization =
    session?.organizationMemberRole !== "member" &&
    hasAnyPermission(permissions ?? session?.permissions, [
      "clinical.settings.personalization",
    ]);

  return (
    <ConfiguracionShell showPersonalization={showPersonalization}>
      {children}
    </ConfiguracionShell>
  );
}
