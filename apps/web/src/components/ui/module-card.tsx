import { cn } from "@/lib/utils";

/** Contenedor de módulo del backoffice (referencia Bolsa de unidades). */
export function ModuleCard({
  className,
  children,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="module-card"
      className={cn(
        "rounded-2xl border border-border/80 bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function ModuleCardTitle({
  className,
  children,
  ...props
}: React.ComponentProps<"h2">) {
  return (
    <h2
      className={cn("text-base font-semibold tracking-tight text-foreground", className)}
      {...props}
    >
      {children}
    </h2>
  );
}

export function ModuleCardDescription({
  className,
  children,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p className={cn("mt-1 text-sm text-muted-foreground", className)} {...props}>
      {children}
    </p>
  );
}

export function ModuleMetric({
  className,
  children,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "text-[2rem] font-bold leading-none tracking-tight tabular-nums text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}
