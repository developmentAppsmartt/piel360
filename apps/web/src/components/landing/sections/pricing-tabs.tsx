"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Microscope, ScanFace } from "lucide-react";
import { cn } from "@/lib/utils";

export type PricingTab = "aesthetic" | "derm";

const TABS: { id: PricingTab; icon: typeof ScanFace }[] = [
  { id: "aesthetic", icon: ScanFace },
  { id: "derm", icon: Microscope },
];

/** Solo el cambio de pestaña es de cliente: los paneles llegan ya pintados
 * desde el servidor (los textos de precios son funciones y no cruzan). */
export function PricingTabs({
  label,
  labels,
  panels,
}: {
  label: string;
  labels: Record<PricingTab, string>;
  panels: Record<PricingTab, ReactNode>;
}) {
  const [tab, setTab] = useState<PricingTab>("aesthetic");
  const tabRefs = useRef<Record<PricingTab, HTMLButtonElement | null>>({ aesthetic: null, derm: null });
  const baseId = useId();

  function onTabKey(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next: PricingTab = tab === "aesthetic" ? "derm" : "aesthetic";
    setTab(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <>
      <div
        role="tablist"
        aria-label={label}
        className="mx-auto mt-10 flex w-fit flex-wrap justify-center gap-1 rounded-full border border-(--landing-line) bg-white p-1.5"
      >
        {TABS.map(({ id, icon: Icon }) => (
          <button
            key={id}
            ref={(node) => {
              tabRefs.current[id] = node;
            }}
            id={`${baseId}-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={tab === id}
            aria-controls={`${baseId}-panel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => setTab(id)}
            onKeyDown={onTabKey}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors",
              tab === id ? "bg-(--landing-navy) text-white" : "text-(--landing-muted) hover:text-(--landing-navy)",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {labels[id]}
          </button>
        ))}
      </div>
      {TABS.map(({ id }) => (
        <div
          key={id}
          id={`${baseId}-panel-${id}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${id}`}
          hidden={tab !== id}
          className="mt-12"
        >
          {panels[id]}
        </div>
      ))}
    </>
  );
}
