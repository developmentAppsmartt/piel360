"use client";

import { CalendarDays, FlaskConical, Layers3, Pencil, Pill, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FITZPATRICK_TYPES } from "@/lib/fitzpatrick-labels";
import { FITZPATRICK_RULE_COLOR_STYLES, fitzpatrickPriorityLabel } from "@/lib/fitzpatrick-rules-ui";
import type { FitzpatrickRule } from "@/lib/queries/fitzpatrick-rules";
import { cn } from "@/lib/utils";

type CatalogMaps = {
  products: Map<string, string>;
  routines: Map<string, string>;
  treatments: Map<string, string>;
  supplements: Map<string, string>;
};

function namesFor(ids: string[], map: Map<string, string>) {
  return ids.map((id) => ({ id, name: map.get(id) ?? `Ítem ${id}` }));
}

export function FitzpatrickRuleCard({
  rule,
  catalog,
  onEdit,
  onDelete,
  deleting,
}: {
  rule: FitzpatrickRule;
  catalog: CatalogMaps;
  onEdit: () => void;
  onDelete: () => void;
  deleting?: boolean;
}) {
  const colors = FITZPATRICK_RULE_COLOR_STYLES[rule.colorKey];
  const type = FITZPATRICK_TYPES[rule.fitzpatrickScale];
  const productNames = namesFor(rule.productGroupIds, catalog.products);
  const routineNames = namesFor(rule.routineIds, catalog.routines);
  const treatmentNames = namesFor(rule.treatmentIds, catalog.treatments);
  const supplementNames = namesFor(rule.supplementGroupIds, catalog.supplements);

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex">
        <div className={cn("w-1.5 shrink-0", colors.bar)} aria-hidden />
        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-48 max-w-sm space-y-1">
              <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">SI</p>
              <p className={cn("text-base font-semibold", colors.text)}>
                Fototipo {rule.fitzpatrickScale} · {type.label}
              </p>
              <p className="text-sm text-muted-foreground">
                {rule.description ?? "Sin descripción clínica."}
              </p>
              <p className="text-xs text-muted-foreground">
                Prioridad: {fitzpatrickPriorityLabel(rule.priority)}
                {!rule.isActive ? " · Inactiva" : ""}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" onClick={onEdit}>
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-destructive hover:text-destructive"
                onClick={onDelete}
                disabled={deleting}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">
              Entonces recomendar
            </p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <RecommendationColumn title="Productos" icon={FlaskConical} items={productNames} />
              <RecommendationColumn title="Rutinas" icon={CalendarDays} items={routineNames} />
              <RecommendationColumn title="Tratamientos" icon={Layers3} items={treatmentNames} />
              <RecommendationColumn title="Suplementos" icon={Pill} items={supplementNames} />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function RecommendationColumn({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: typeof FlaskConical;
  items: { id: string; name: string }[];
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
      <div className="mb-2 flex items-center gap-2 text-primary">
        <Icon className="size-4 shrink-0" />
        <span className="text-xs font-semibold tracking-wide uppercase">{title}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin vincular</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-sm font-medium text-foreground"
            >
              {item.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
