import type {
  FitzpatrickRuleColorKey,
  FitzpatrickRulePriority,
} from "@/lib/queries/fitzpatrick-rules";

export const FITZPATRICK_RULE_PRIORITY_OPTIONS: {
  value: FitzpatrickRulePriority;
  label: string;
}[] = [
  { value: "low", label: "Baja" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
  { value: "very_high", label: "Muy alta" },
];

export const FITZPATRICK_RULE_COLOR_STYLES: Record<
  FitzpatrickRuleColorKey,
  { bar: string; badge: string; text: string }
> = {
  green: {
    bar: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    text: "text-emerald-700",
  },
  blue: {
    bar: "bg-sky-500",
    badge: "bg-sky-50 text-sky-700 border-sky-200",
    text: "text-sky-700",
  },
  orange: {
    bar: "bg-orange-400",
    badge: "bg-orange-50 text-orange-700 border-orange-200",
    text: "text-orange-700",
  },
  amber: {
    bar: "bg-amber-500",
    badge: "bg-amber-50 text-amber-800 border-amber-200",
    text: "text-amber-800",
  },
  red: {
    bar: "bg-rose-500",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    text: "text-rose-700",
  },
};

export function fitzpatrickPriorityLabel(priority: FitzpatrickRulePriority): string {
  return (
    FITZPATRICK_RULE_PRIORITY_OPTIONS.find((option) => option.value === priority)
      ?.label ?? priority
  );
}
