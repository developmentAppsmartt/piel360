import type { ReactNode } from "react";
import { ModuleCard } from "@/components/ui/module-card";
import { cn } from "@/lib/utils";

const campo =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

/** Asunto, preencabezado y nombre interno; el editor del cuerpo entra como
 * `children`, en el paso 3. El recordatorio de cita (`daysBefore` no nulo)
 * suma los días de anticipación del envío. */
export function TemplateFields({
  subject,
  onSubject,
  preheader,
  onPreheader,
  name,
  onName,
  daysBefore,
  onDaysBefore,
  children,
}: {
  subject: string;
  onSubject: (valor: string) => void;
  preheader: string;
  onPreheader: (valor: string) => void;
  name: string;
  onName: (valor: string) => void;
  daysBefore: number | null;
  onDaysBefore: (valor: number) => void;
  children: ReactNode;
}) {
  return (
    <ModuleCard className="space-y-4 p-5">
      {daysBefore != null ? (
        <label className="block max-w-md space-y-2">
          <span className="block text-sm font-medium">Días de anticipación</span>
          <input
            type="number"
            min={1}
            max={30}
            value={daysBefore}
            onChange={(e) => onDaysBefore(Number(e.target.value))}
            className={cn(campo, "w-28")}
          />
          <span className="block text-xs text-muted-foreground">
            Se envía al paciente {daysBefore === 1 ? "1 día" : `${daysBefore} días`}{" "}
            antes de su cita confirmada, a las 8:00 a. m. Si la cita se agenda
            con menos anticipación, sale al día siguiente.
          </span>
        </label>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="block text-sm font-medium">1. Línea de asunto</span>
          <input
            value={subject}
            onChange={(e) => onSubject(e.target.value)}
            className={campo}
          />
        </label>
        <label className="space-y-2">
          <span className="block text-sm font-medium">2. Preencabezado</span>
          <input
            value={preheader}
            onChange={(e) => onPreheader(e.target.value)}
            className={campo}
          />
        </label>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium">3. Contenido del correo</span>
          <input
            value={name}
            onChange={(e) => onName(e.target.value)}
            className="h-8 w-48 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-primary"
            placeholder="Nombre interno"
          />
        </div>
        {children}
      </div>
    </ModuleCard>
  );
}
