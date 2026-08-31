import { ConfiguracionShell } from "./config-shell";

export default function ConfiguracionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ConfiguracionShell>{children}</ConfiguracionShell>;
}
