import type { ReactNode } from "react";
import { ModuleCard } from "@/components/ui/module-card";

const campo =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

/** Asunto, preencabezado y nombre interno; el editor del cuerpo entra como
 * `children`, en el paso 3. */
export function TemplateFields({
  subject,
  onSubject,
  preheader,
  onPreheader,
  name,
  onName,
  children,
}: {
  subject: string;
  onSubject: (valor: string) => void;
  preheader: string;
  onPreheader: (valor: string) => void;
  name: string;
  onName: (valor: string) => void;
  children: ReactNode;
}) {
  return (
    <ModuleCard className="space-y-4 p-5">
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
