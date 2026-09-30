import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Droplets,
  Flame,
  Layers,
  Microscope,
  ShieldAlert,
  Biohazard,
  Sprout,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ConditionMarker = "new" | "updated";

type Condition = {
  label: string;
  marker?: ConditionMarker;
  note?: string;
};

type ConditionGroup = {
  key: string;
  label: string;
  icon: LucideIcon;
  tone: string;
  conditions: Condition[];
  /** Estados sin patología: no cuentan como condiciones reconocidas. */
  healthy?: boolean;
};

const GROUPS: ConditionGroup[] = [
  {
    key: "healthy",
    label: "Sin patología",
    icon: CheckCircle2,
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    healthy: true,
    conditions: [
      { label: "Piel saludable" },
      { label: "Uñas saludables", marker: "new" },
    ],
  },
  {
    key: "benign",
    label: "Neoplasias benignas",
    icon: CircleDot,
    tone: "bg-sky-50 text-sky-700 ring-sky-200",
    conditions: [
      { label: "Nevus benigno" },
      { label: "Nevus papilomatoso" },
      { label: "Nevus acral" },
      { label: "Nevus halo" },
      { label: "Nevus Spitz" },
      { label: "Dermatofibroma" },
      { label: "Hemangioma" },
      { label: "Granuloma piogénico" },
      { label: "Papiloma", marker: "updated" },
      { label: "Nevus azul", marker: "updated" },
      { label: "Léntigo", marker: "updated" },
      { label: "Queratosis seborreica", marker: "updated" },
    ],
  },
  {
    key: "precancer",
    label: "Condiciones precancerosas",
    icon: AlertTriangle,
    tone: "bg-amber-50 text-amber-700 ring-amber-200",
    conditions: [{ label: "Queratosis actínica" }, { label: "Nevus displásico" }],
  },
  {
    key: "malignant",
    label: "Neoplasias cutáneas malignas",
    icon: ShieldAlert,
    tone: "bg-rose-50 text-rose-700 ring-rose-200",
    conditions: [
      { label: "Carcinoma de células basales" },
      { label: "Carcinoma de células escamosas" },
      { label: "Melanoma" },
      { label: "Melanoma lentigo" },
      { label: "Queratocantoma", marker: "updated" },
      { label: "Enfermedad de Bowen", marker: "updated" },
    ],
  },
  {
    key: "viral",
    label: "Enfermedades virales de la piel",
    icon: Biohazard,
    tone: "bg-violet-50 text-violet-700 ring-violet-200",
    conditions: [
      { label: "Verruga común" },
      { label: "Verruga plana" },
      { label: "Verruga plantar" },
      { label: "Molusco contagioso" },
    ],
  },
  {
    key: "herpetic",
    label: "Condiciones herpéticas",
    icon: Flame,
    tone: "bg-orange-50 text-orange-700 ring-orange-200",
    conditions: [
      { label: "Herpes simple" },
      { label: "Herpes genital" },
      { label: "Varicela" },
      { label: "Herpes zóster", note: "Culebrilla" },
    ],
  },
  {
    key: "mycosis",
    label: "Micosis",
    icon: Sprout,
    tone: "bg-lime-50 text-lime-700 ring-lime-200",
    conditions: [
      { label: "Micosis cutánea" },
      { label: "Onicomicosis" },
      { label: "Tricomicosis" },
      { label: "Tiña versicolor" },
    ],
  },
  {
    key: "papulosquamous",
    label: "Trastornos papuloescamosos",
    icon: Layers,
    tone: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    conditions: [
      { label: "Psoriasis vulgar" },
      { label: "Psoriasis pustular" },
      { label: "Liquen plano" },
      { label: "Pitiriasis rosada", note: "Liquen rosado" },
      { label: "Liquen brillante" },
      { label: "Liquen de Devergie" },
      { label: "Liquen lineal" },
    ],
  },
  {
    key: "acne",
    label: "Acné y rosácea",
    icon: Droplets,
    tone: "bg-pink-50 text-pink-700 ring-pink-200",
    conditions: [
      { label: "Acné vulgar" },
      { label: "Acné pustular" },
      { label: "Acné quístico" },
      { label: "Comedones cerrados" },
      { label: "Comedones abiertos" },
      { label: "Milia" },
      { label: "Rosácea" },
    ],
  },
  {
    key: "dermatitis",
    label: "Dermatitis, eccema y otras condiciones",
    icon: Waves,
    tone: "bg-teal-50 text-teal-700 ring-teal-200",
    conditions: [
      { label: "Dermatitis atópica" },
      { label: "Dermatitis" },
      { label: "Eccema" },
      { label: "Dermatitis seborreica", marker: "updated" },
      { label: "Urticaria" },
      { label: "Eritema", marker: "new" },
      { label: "Hidradenitis", marker: "new" },
      { label: "Vitíligo", marker: "new" },
    ],
  },
];

const CONDITION_COUNT = GROUPS.filter((g) => !g.healthy).reduce(
  (sum, g) => sum + g.conditions.length,
  0,
);

function MarkerDot({
  marker,
  className,
}: {
  marker: ConditionMarker;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block size-1.5 shrink-0 rounded-full align-middle",
        className,
        marker === "new" ? "bg-emerald-500" : "bg-orange-400",
      )}
      aria-label={marker === "new" ? "Añadida en 2026" : "Clasificación actualizada"}
    />
  );
}

export function DermatologyConditionsInfo() {
  return (
    <section className="space-y-4 rounded-[1.75rem] border border-primary/15 bg-white p-5 text-sm text-muted-foreground shadow-sm sm:p-7">
      <div className="flex items-start gap-2.5">
        <Microscope className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">
            Afecciones cutáneas reconocidas por el Análisis Dermatológico Piel 360
          </h3>
          <p className="leading-relaxed">
            Los planes dermatológicos identifican {CONDITION_COUNT} condiciones
            agrupadas en {GROUPS.length - 1} grupos de patología, además de los
            estados sin patología (piel y uñas saludables).
          </p>
        </div>
      </div>

      <dl className="grid gap-x-8 gap-y-3 md:grid-cols-2">
        {GROUPS.map((group) => {
          const Icon = group.icon;
          return (
            <div key={group.key} className="flex items-start gap-2.5">
              <span
                className={cn(
                  "mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full ring-1",
                  group.tone,
                )}
              >
                <Icon className="size-3.5" />
              </span>
              <div className="min-w-0 leading-relaxed">
                <dt className="font-semibold text-foreground">{group.label}</dt>
                <dd>
                  {group.conditions.map((condition, index) => (
                    <span key={condition.label}>
                      {condition.label}
                      {condition.note ? ` (${condition.note})` : null}
                      {condition.marker ? (
                        <MarkerDot marker={condition.marker} className="ml-1" />
                      ) : null}
                      {index < group.conditions.length - 1 ? ", " : "."}
                    </span>
                  ))}
                </dd>
              </div>
            </div>
          );
        })}
      </dl>

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <MarkerDot marker="new" />
          Condiciones añadidas en 2026
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MarkerDot marker="updated" />
          Condiciones con clasificación actualizada
        </span>
      </div>
    </section>
  );
}
