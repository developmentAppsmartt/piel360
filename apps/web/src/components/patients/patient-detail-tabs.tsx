"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  patientComparisonsPath,
  patientDetailPath,
  type PatientsPanel,
} from "@/lib/patients-panel";
import { cn } from "@/lib/utils";

export function PatientDetailTabs({
  patientId,
  panel = "doctor",
}: {
  patientId: string;
  panel?: PatientsPanel;
}) {
  const pathname = usePathname();
  const base = patientDetailPath(panel, patientId);
  const tabs = [
    { href: base, label: "Resumen", match: (p: string) => p === base },
    {
      href: patientComparisonsPath(panel, patientId),
      label: "Comparaciones",
      match: (p: string) => p.startsWith(`${base}/comparaciones`),
    },
  ] as const;

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border">
      {tabs.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
