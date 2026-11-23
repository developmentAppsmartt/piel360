"use client";

import Image from "next/image";
import { Info, Microscope, ScanFace, Smartphone, Sun } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const ABOUT_FEATURES = [
  { icon: ScanFace, label: "Análisis estético" },
  { icon: Microscope, label: "Análisis dermatológico" },
  { icon: Sun, label: "Análisis fototipo" },
  { icon: Smartphone, label: "Desde cualquier dispositivo" },
] as const;

/** Ítem de sidebar que abre un modal informativo en vez de navegar. */
export function AboutNavItem({ collapsed }: { collapsed: boolean }) {
  return (
    <Dialog>
      <DialogTrigger
        title={collapsed ? "Acerca de" : undefined}
        aria-label="Acerca de"
        className={cn(
          "flex min-h-11 w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold tracking-tight text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          collapsed && "relative mx-auto size-10 min-h-10 justify-center px-0",
        )}
      >
        <span className="flex size-5 shrink-0 items-center justify-center">
          <Info className="size-5" />
        </span>
        {!collapsed ? <span className="flex-1 truncate text-left">Acerca de</span> : null}
      </DialogTrigger>
      <AboutDialogContent />
    </Dialog>
  );
}

/** El contenido del modal «Acerca de»: lo abren el menú lateral y el menú
 * del encabezado. Va dentro de un `<Dialog>`. */
export function AboutDialogContent() {
  return (
  <DialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:max-w-md">
    <div className="border-b border-border px-5 py-4">
      <DialogTitle>Acerca de</DialogTitle>
    </div>
    <div className="space-y-5 px-5 py-5">
      <Image
        src="/logo-piel360.png"
        alt="Piel360"
        width={575}
        height={210}
        className="h-auto w-44"
      />
      <p className="text-sm leading-relaxed text-foreground">
        <strong>PIEL360</strong> es una plataforma de análisis de la piel
        que combina inteligencia artificial con tecnología avanzada de
        imagen, para ofrecerte evaluaciones estéticas y dermatológicas
        precisas, seguras y personalizadas. Nuestro objetivo es ayudarte a
        comprender mejor tu piel y cuidar tu salud cutánea de forma
        simple, confiable y desde cualquier dispositivo móvil.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ABOUT_FEATURES.map((feature) => (
          <div
            key={feature.label}
            className="flex flex-col items-center gap-1.5 text-center"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600">
              <feature.icon className="size-5" />
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">
              {feature.label}
            </span>
          </div>
        ))}
      </div>
      <div className="flex justify-center">
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          Versión 1.0.0
        </span>
      </div>
      <p className="text-center text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        Tecnología <span className="px-1 text-primary">•</span> Ciencia{" "}
        <span className="px-1 text-primary">•</span> Tu piel
      </p>
    </div>
  </DialogContent>
  );
}
