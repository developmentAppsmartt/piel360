"use client";

import type { ReactNode } from "react";
import { ChevronDown, ChevronUp, type LucideIcon } from "lucide-react";
import { ModuleCard } from "@/components/ui/module-card";
import type { AnalysisCareItem } from "@/lib/queries/skin-age-rules";
import { cn } from "@/lib/utils";
import {
  itemToDetail,
  linkedProductsForRoutine,
  routineHasMoment,
  routineImages,
  routineMediaItems,
  type CatalogDetail,
  type CatalogKind,
  type MediaPreview,
} from "./recommendation-items";

export function RecoSection({
  title,
  icon: Icon,
  open,
  onToggle,
  onSeeAll,
  children,
}: {
  title: string;
  icon: LucideIcon;
  open: boolean;
  onToggle: () => void;
  onSeeAll: () => void;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 items-center gap-2 text-sm font-semibold"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="size-4" />
          </span>
          <span className="truncate">{title}</span>
          {open ? (
            <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          )}
        </button>
        {open ? (
          <button
            type="button"
            onClick={onSeeAll}
            className="shrink-0 text-xs font-medium text-primary hover:underline"
          >
            Ver todas
          </button>
        ) : null}
      </div>
      <div className="h-0.5 rounded-full bg-primary/20" />
      {open ? children : null}
    </div>
  );
}

export function CardCarousel({
  items,
  kind,
  emptyMessage,
  onOpen,
}: {
  items: AnalysisCareItem[];
  kind: CatalogKind;
  emptyMessage: string;
  onOpen: (detail: CatalogDetail) => void;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }
  return (
    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onOpen(itemToDetail(item, kind))}
          className="w-32 shrink-0 space-y-1.5 rounded-xl border border-border bg-card p-2 text-left hover:border-primary/40"
        >
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt=""
              className="h-20 w-full rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-20 w-full items-center justify-center rounded-lg bg-muted text-lg font-bold text-primary">
              {item.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <p className="line-clamp-2 text-xs font-medium">{item.name}</p>
          {item.categoryName ? (
            <p className="truncate text-[11px] text-muted-foreground">{item.categoryName}</p>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function DetailCardCarousel({
  cards,
  onOpen,
}: {
  cards: CatalogDetail[];
  onOpen: (detail: CatalogDetail) => void;
}) {
  if (cards.length === 0) return null;
  return (
    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
      {cards.map((card, index) => (
        <button
          key={`${card.title}-${index}`}
          type="button"
          onClick={() => onOpen(card)}
          className="w-28 shrink-0 space-y-1.5 rounded-xl border border-border bg-card p-2 text-left hover:border-primary/40"
        >
          {card.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.imageUrl}
              alt=""
              className="h-16 w-full rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-16 w-full items-center justify-center rounded-lg bg-muted text-base font-bold text-primary">
              {card.title.slice(0, 1).toUpperCase()}
            </div>
          )}
          <p className="line-clamp-2 text-xs font-medium">{card.title}</p>
        </button>
      ))}
    </div>
  );
}

export function RoutineCarousel({
  routines,
  selectedId,
  onSelect,
}: {
  routines: AnalysisCareItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
      {routines.map((routine, index) => {
        const active = routine.id === selectedId;
        const images = routineImages(routine);
        const am = routineHasMoment(routine, "am");
        const pm = routineHasMoment(routine, "pm");
        return (
          <button
            key={routine.id}
            type="button"
            onClick={() => onSelect(routine.id)}
            className={cn(
              "w-36 shrink-0 space-y-1.5 rounded-xl border p-2 text-left",
              active ? "border-primary bg-primary/5" : "border-border bg-card",
            )}
          >
            <div className="relative flex h-20 w-full overflow-hidden rounded-lg bg-muted">
              {index === 0 ? (
                <span className="absolute left-1 top-1 z-10 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground">
                  Recomendada
                </span>
              ) : null}
              {images.length > 0 ? (
                images.map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={url} src={url} alt="" className="h-full flex-1 object-cover" />
                ))
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg font-bold text-primary">
                  {routine.name.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <p className="line-clamp-2 text-xs font-medium">{routine.name}</p>
            {am || pm ? (
              <p className="truncate text-[11px] font-medium text-primary">
                {[am ? "Mañana" : null, pm ? "Noche" : null].filter(Boolean).join(" / ")}
              </p>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function RoutineDetail({
  routine,
  onOpenMedia,
  onOpenProduct,
}: {
  routine: AnalysisCareItem;
  onOpenMedia: (preview: MediaPreview) => void;
  onOpenProduct: (detail: CatalogDetail) => void;
}) {
  const am = routineHasMoment(routine, "am");
  const pm = routineHasMoment(routine, "pm");
  const mediaItems = routineMediaItems(routine);
  const linkedProducts = linkedProductsForRoutine(routine);
  const steps = [...(routine.steps ?? [])].sort((a, b) => a.order - b.order);

  return (
    <ModuleCard className="space-y-4 p-4">
      <div>
        <p className="font-medium">{routine.name}</p>
        {routine.description ? (
          <p className="text-sm text-muted-foreground">{routine.description}</p>
        ) : null}
        {am || pm ? (
          <p className="mt-1 text-xs font-medium text-primary">
            {[am ? "☀ Mañana" : null, pm ? "☾ Noche" : null].filter(Boolean).join("   ·   ")}
          </p>
        ) : null}
      </div>

      {steps.length > 0 ? (
        <ol className="space-y-2">
          {steps.map((step, index) => (
            <li key={step.id} className="text-sm">
              <span className="font-medium">
                {index + 1}. {step.title}
              </span>
              {step.description ? (
                <span className="text-muted-foreground"> — {step.description}</span>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}

      {mediaItems.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">
            ¿Cómo seguir esta rutina?
          </p>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1">
            {mediaItems.map((item) => (
              <button
                key={`${item.kind}-${item.url}`}
                type="button"
                onClick={() => onOpenMedia(item)}
                className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg"
              >
                {item.kind === "video" ? (
                  <video src={item.url} className="h-full w-full object-cover" muted playsInline />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt="" className="h-full w-full object-cover" />
                )}
                <span className="absolute inset-x-0 bottom-0 bg-black/55 px-1 py-0.5 text-[9px] font-semibold text-white">
                  {item.kind === "video" ? "Ver video" : "Ampliar"}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {linkedProducts.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Productos vinculados</p>
          <DetailCardCarousel cards={linkedProducts} onOpen={onOpenProduct} />
        </div>
      ) : null}
    </ModuleCard>
  );
}
