import type { SkinAgeRuleColorKey, SkinAgeRulePriority } from "@/lib/queries/skin-age-rules";

export const SKIN_AGE_RULE_PRIORITY_OPTIONS: {
  value: SkinAgeRulePriority;
  label: string;
}[] = [
  { value: "low", label: "Baja" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
  { value: "very_high", label: "Muy alta" },
];

export const SKIN_AGE_RULE_COLOR_STYLES: Record<
  SkinAgeRuleColorKey,
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

export function formatSkinAgeDifferenceRange(
  minDifference: number,
  maxDifference: number,
): string {
  if (minDifference <= -100 && maxDifference <= -5) {
    return `≤ ${maxDifference} años`;
  }
  if (minDifference >= 8 && maxDifference >= 100) {
    return `≥ +${minDifference} años`;
  }
  if (minDifference < 0 && maxDifference < 0) {
    return `${minDifference} a ${maxDifference} años`;
  }
  if (minDifference >= 0 && maxDifference >= 0) {
    return `+${minDifference} a +${maxDifference} años`;
  }
  return `${minDifference} a ${maxDifference} años`;
}

export function priorityLabel(priority: SkinAgeRulePriority): string {
  return (
    SKIN_AGE_RULE_PRIORITY_OPTIONS.find((option) => option.value === priority)?.label ??
    priority
  );
}
