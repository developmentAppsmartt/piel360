import { Clock3, Headset, Mail } from "lucide-react";
import { ModuleCard } from "@/components/ui/module-card";

const SUPPORT_EMAIL = "soporte@piel360.com";

/** Columna derecha de Soporte: correo directo y tiempo de respuesta. */
export function SupportHelpCard() {
  return (
    <ModuleCard className="space-y-4 p-5">
      <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Headset className="size-7" aria-hidden />
      </span>
      <h2 className="text-lg font-bold text-foreground">¿Necesitas ayuda inmediata?</h2>
      <a
        href={`mailto:${SUPPORT_EMAIL}`}
        className="flex items-center gap-2 border-t border-border pt-4 text-sm font-medium text-primary hover:underline"
      >
        <Mail className="size-4" aria-hidden />
        {SUPPORT_EMAIL}
      </a>
      <div className="space-y-2 rounded-xl bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <Clock3 className="mt-0.5 size-8 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="text-sm text-foreground">Tiempo estimado de respuesta:</p>
            <p className="text-lg font-bold text-foreground">1–2 horas</p>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          De acuerdo con el tipo de solicitud, nuestro equipo de PIEL 360 clasifica el nivel de
          soporte para brindarte una respuesta en un tiempo estimado entre{" "}
          <strong className="text-foreground">media hora y 2 horas</strong>.
        </p>
      </div>
    </ModuleCard>
  );
}
