import type {
  SkinAgeRule,
  SkinAgeRuleColorKey,
  SkinAgeRulePriority,
} from "@/lib/queries/skin-age-rules";
import { formatSkinAgeDifferenceRange } from "@/lib/skin-age-rules-ui";

export type Scenario = "younger" | "similar" | "older";

export type SkinAgeRuleFormState = {
  name: string;
  scenario: Scenario;
  fromYears: number;
  toYears: number;
  description: string;
  priority: SkinAgeRulePriority;
  colorKey: SkinAgeRuleColorKey;
  routineIds: string[];
  treatmentIds: string[];
  productGroupIds: string[];
  supplementGroupIds: string[];
  /** null = todos; [] = «específico» todavía sin elegir ninguno. */
  skinTypes: string[] | null;
  fitzpatrickScales: string[] | null;
};

export const SCENARIOS: {
  value: Scenario;
  title: string;
  hint: string;
  colorKey: SkinAgeRuleColorKey;
}[] = [
  {
    value: "younger",
    title: "Piel más joven",
    hint: "Edad del análisis menor que la edad del paciente",
    colorKey: "green",
  },
  {
    value: "similar",
    title: "Edades similares",
    hint: "Edad del análisis cercana a la edad del paciente",
    colorKey: "orange",
  },
  {
    value: "older",
    title: "Piel más envejecida",
    hint: "Edad del análisis mayor que la edad del paciente",
    colorKey: "red",
  },
];

/** El escenario sale del signo del rango guardado: no se guarda aparte. Por
 * eso los años de cada escenario no pueden pisarse (ver `formError`). */
function scenarioFromDiff(min: number, max: number): Scenario {
  if (max <= 0 && min < 0) return "younger";
  if (min > 0) return "older";
  return "similar";
}

function yearsFromDiff(min: number, max: number, scenario: Scenario) {
  if (scenario === "younger") return { fromYears: -max, toYears: -min };
  if (scenario === "older") return { fromYears: min, toYears: max };
  return { fromYears: Math.max(min, 0), toYears: Math.max(max, 0) };
}

/** Por qué la regla no se puede guardar, o null. Una regla «más joven» que
 * empezaba en 0 años se guardaba bien (-6..0), pero al reabrirla salía como
 * «Edades similares 0 a 0» y al guardar de nuevo se perdía el rango. Del otro
 * lado, «Edades similares» siempre empieza en 0 (el formulario fija el campo):
 * una desde 2 años reabría como «más envejecida». */
export function formError(form: SkinAgeRuleFormState): string | null {
  if (!form.name.trim()) return "Escribe el nombre de la regla.";
  if (form.fromYears < 0 || form.toYears < 0) {
    return "Los años de diferencia deben ser 0 o mayores.";
  }
  if (form.fromYears > form.toYears) {
    return "«Desde» no puede ser mayor que «Hasta».";
  }
  if (form.scenario !== "similar" && form.fromYears < 1) {
    return "En este escenario el rango empieza en 1 año: la diferencia de 0 años es de «Edades similares».";
  }
  if (form.skinTypes?.length === 0) return "Elige al menos un biotipo.";
  if (form.fitzpatrickScales?.length === 0) return "Elige al menos un fototipo.";
  return null;
}

export function toDifferences(form: SkinAgeRuleFormState): {
  minDifference: number;
  maxDifference: number;
  label: string;
  description: string;
  colorKey: SkinAgeRuleColorKey;
} {
  const from = Math.min(form.fromYears, form.toYears);
  const to = Math.max(form.fromYears, form.toYears);

  if (form.scenario === "younger") {
    const minDifference = -to;
    const maxDifference = -from;
    return {
      minDifference,
      maxDifference,
      label: formatSkinAgeDifferenceRange(minDifference, maxDifference),
      description:
        form.description.trim() ||
        `La edad de la piel (análisis) es ${from} a ${to} años menor que la edad del paciente.`,
      colorKey: form.colorKey || "green",
    };
  }

  if (form.scenario === "older") {
    const minDifference = from;
    const maxDifference = to;
    return {
      minDifference,
      maxDifference,
      label: formatSkinAgeDifferenceRange(minDifference, maxDifference),
      description:
        form.description.trim() ||
        `La edad de la piel (análisis) es ${from} a ${to} años mayor que la edad del paciente.`,
      colorKey: form.colorKey || "red",
    };
  }

  return {
    minDifference: from,
    maxDifference: to,
    label: formatSkinAgeDifferenceRange(from, to),
    description:
      form.description.trim() ||
      `La edad de la piel (análisis) se parece a la edad del paciente (diferencia ${from} a ${to} años).`,
    colorKey: form.colorKey || "orange",
  };
}

export function defaultForm(rule?: SkinAgeRule | null): SkinAgeRuleFormState {
  if (!rule) {
    return {
      name: "",
      scenario: "older",
      fromYears: 4,
      toYears: 7,
      description: "",
      priority: "high",
      colorKey: "amber",
      routineIds: [],
      treatmentIds: [],
      productGroupIds: [],
      supplementGroupIds: [],
      skinTypes: null,
      fitzpatrickScales: null,
    };
  }
  const scenario = scenarioFromDiff(rule.minDifference, rule.maxDifference);
  const years = yearsFromDiff(rule.minDifference, rule.maxDifference, scenario);
  return {
    name: rule.label,
    scenario,
    fromYears: years.fromYears,
    toYears: years.toYears,
    description: rule.description ?? "",
    priority: rule.priority,
    colorKey: rule.colorKey,
    routineIds: rule.routineIds,
    treatmentIds: rule.treatmentIds,
    productGroupIds: rule.productGroupIds,
    supplementGroupIds: rule.supplementGroupIds,
    skinTypes: rule.skinTypes.length > 0 ? rule.skinTypes : null,
    fitzpatrickScales:
      rule.fitzpatrickScales.length > 0 ? rule.fitzpatrickScales : null,
  };
}
