import { EmailTemplatesWorkspace } from "@/components/email-templates/email-templates-workspace";

/** Los tres botones del panel de verificación (ver verification-dashboard.tsx)
 * — cada decisión manda su correo y el moderador edita el texto acá. */
const MODERATION_EVENT_KINDS = [
  "doctor_verification_approved",
  "doctor_verification_changes_requested",
  "doctor_verification_rejected",
] as const;

export default function AdminEmailTemplatesPage() {
  return <EmailTemplatesWorkspace eventKinds={MODERATION_EVENT_KINDS} />;
}
