import { ModuleCard, ModuleCardDescription, ModuleCardTitle } from "@/components/ui/module-card";
import { cn } from "@/lib/utils";

export const inputClass =
  "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/20";

export const textareaClass = inputClass.replace("h-10", "min-h-24 py-2");

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <ModuleCard className="space-y-5 p-5 sm:p-6">
      <div>
        <ModuleCardTitle>{title}</ModuleCardTitle>
        <ModuleCardDescription className="mt-1">{description}</ModuleCardDescription>
      </div>
      {children}
    </ModuleCard>
  );
}

export function FormField({
  label,
  id,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  id?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function ChipGroup({
  options,
  value,
  onChange,
  allowClear = true,
}: {
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  allowClear?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active && allowClear ? "" : o.value)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/50",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Sí / No con un tercer estado, «sin responder» (null): volver a pulsar la
 * opción marcada la quita. En antecedentes, «No» y «no se preguntó» no son lo
 * mismo. */
export function YesNoToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean | null) => void;
}) {
  const options = [
    { answer: true, text: "Sí" },
    { answer: false, text: "No" },
  ] as const;
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-3 last:border-b-0">
      <span className="text-sm text-foreground">{label}</span>
      <div role="group" aria-label={label} className="flex shrink-0 overflow-hidden rounded-full border border-border">
        {options.map(({ answer, text }) => {
          const active = value === answer;
          return (
            <button
              key={text}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(active ? null : answer)}
              className={cn(
                "min-w-12 px-3.5 py-1.5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none",
                active ? "bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-muted/60",
              )}
            >
              {text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
