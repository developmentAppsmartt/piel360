import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const ICON_TONES = {
  blue: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  violet: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  pink: "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300",
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  orange: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
} as const;

export type StatTone = keyof typeof ICON_TONES;

/**
 * Tarjeta de dato con ícono: rótulo, valor y pie opcional. `layout="stack"`
 * centra todo (encabezados de análisis y reporte); `row` pone el ícono a la
 * izquierda (listas y ficha del paciente).
 */
export function StatTile({
  icon: Icon,
  label,
  value,
  footer,
  tone = "blue",
  layout = "row",
  className,
}: {
  icon: LucideIcon;
  label: ReactNode;
  value: ReactNode;
  footer?: ReactNode;
  tone?: StatTone;
  layout?: "row" | "stack";
  className?: string;
}) {
  const stack = layout === "stack";
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-card p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-4",
        stack ? "flex flex-col items-center gap-1.5 text-center" : "flex items-center gap-2.5 sm:gap-3",
        className,
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl",
          stack ? "size-11" : "size-9 sm:size-11",
          ICON_TONES[tone],
        )}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 wrap-anywhere">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div
          className={cn("font-bold text-foreground", stack ? "text-2xl" : "text-base leading-tight sm:text-lg")}
        >
          {value}
        </div>
        {footer ? <div className="mt-0.5 text-xs text-muted-foreground">{footer}</div> : null}
      </div>
    </div>
  );
}
