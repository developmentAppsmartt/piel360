import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoginIconField({
  label,
  icon: Icon,
  endAdornment,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon: LucideIcon;
  endAdornment?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={props.id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <input
          {...props}
          className={cn(
            "w-full rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-12 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400",
            "focus:border-primary focus:ring-2 focus:ring-primary/15",
            className,
          )}
        />
        <div className="pointer-events-none absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1.5 text-slate-400">
          {endAdornment ?? <Icon className="size-4 shrink-0" aria-hidden />}
        </div>
      </div>
    </div>
  );
}
