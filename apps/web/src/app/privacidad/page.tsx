import type { Metadata } from "next";
import { PRIVACY_POLICY } from "@piel360/shared";
import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { LegalPageShell } from "@/components/legal/legal-page-shell";

export const metadata: Metadata = { title: "Política de tratamiento de datos · Piel360" };

export default function PrivacidadPage() {
  return (
    <LegalPageShell>
      <LegalDocumentView doc={PRIVACY_POLICY} />
    </LegalPageShell>
  );
}
