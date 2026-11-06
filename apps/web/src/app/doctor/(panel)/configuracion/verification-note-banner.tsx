/** Nota del equipo de verificación (ajustes solicitados o rechazo) en la
 * cuenta del profesional y en la de la empresa. */
export function VerificationNoteBanner({
  status,
  note,
  noteAt,
  fixHint = false,
}: {
  status: string | null | undefined;
  note: string | null | undefined;
  noteAt?: string | null;
  /** Recordar que al guardar se vuelve a revisar la cuenta. */
  fixHint?: boolean;
}) {
  if (!note || (status !== "in_review" && status !== "rejected" && status !== "pending")) {
    return null;
  }
  const rejected = status === "rejected";
  return (
    <div
      className={
        rejected
          ? "rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          : "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      }
      role="status"
    >
      <p className="font-semibold">
        {rejected
          ? "Tu solicitud fue rechazada"
          : "El equipo de verificación solicitó ajustes"}
      </p>
      <p className="mt-1 whitespace-pre-wrap">{note}</p>
      {noteAt ? (
        <p className="mt-2 text-xs opacity-80">
          {new Date(noteAt).toLocaleString("es-CO")}
        </p>
      ) : null}
      {fixHint ? (
        <p className="mt-2 text-xs">
          Corrige la información indicada y guarda los cambios para que
          vuelvan a revisar tu cuenta.
        </p>
      ) : null}
    </div>
  );
}
