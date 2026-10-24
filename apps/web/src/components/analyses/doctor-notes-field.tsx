/** Observaciones del médico (máx. 500), las mismas al confirmar y al corregir. */
export function DoctorNotesField({
  value,
  onChange,
  required = false,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor="doctorNotes" className="text-sm font-medium">
        Observaciones{required ? "" : " (opcional)"}
      </label>
      <textarea
        id="doctorNotes"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        maxLength={500}
        disabled={disabled}
        placeholder="Describe el diagnóstico del médico"
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
      />
      <p className="text-right text-xs text-muted-foreground">
        {value.length}/500
      </p>
    </div>
  );
}
