import type { Metadata } from "next";
import { TERMS_OF_USE } from "@piel360/shared";
import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { LegalPageShell } from "@/components/legal/legal-page-shell";

export const metadata: Metadata = { title: "Términos y condiciones · Piel360" };

export default function TerminosPage() {
  return (
    <LegalPageShell>
      <LegalDocumentView doc={TERMS_OF_USE} />
    </LegalPageShell>
  );
}
