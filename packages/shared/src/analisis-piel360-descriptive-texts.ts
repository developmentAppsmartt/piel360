/**
 * Textos del análisis estético que no dependen de un puntaje: uno por biotipo
 * y zona del rostro, y uno por fototipo (Configuración › Rangos de
 * puntuación). Lo que la cuenta no personaliza usa los de este archivo.
 */
import { ANALISIS_PIEL360_SKIN_TYPE_VALUES } from "./constants.js";
import { FITZPATRICK_SCALES, type FitzpatrickScale } from "./fitzpatrick.js";

/** Las zonas que trae `hd_skin_type`: cara completa, zona T y zona U. */
export const SKIN_TYPE_TEXT_ZONES = ["whole", "t_zone", "u_zone"] as const;
export type SkinTypeTextZone = (typeof SKIN_TYPE_TEXT_ZONES)[number];
export type SkinTypeValue = (typeof ANALISIS_PIEL360_SKIN_TYPE_VALUES)[number];

export const DESCRIPTIVE_TEXT_MAX_LENGTH = 500;

export type AnalisisPiel360DescriptiveTexts = {
  skinTypeTexts?: Partial<Record<SkinTypeTextZone, Partial<Record<SkinTypeValue, string>>>>;
  fitzpatrickTexts?: Partial<Record<FitzpatrickScale, string>>;
};

export const DEFAULT_SKIN_TYPE_TEXTS: Record<SkinTypeTextZone, Record<SkinTypeValue, string>> = {
  whole: {
    normal:
      "Tu piel es normal: se ve equilibrada, sin exceso de grasa ni resequedad. Mantén una rutina sencilla con limpieza suave, hidratación y protector solar diario.",
    oily: "Tu piel es grasa: produce más sebo, con brillo y poros más visibles. Usa un limpiador suave, un hidratante ligero libre de aceite y protector solar no comedogénico.",
    dry: "Tu piel es seca: produce menos grasa y puede sentirse tirante o áspera. Prioriza un limpiador suave y un hidratante con ceramidas o ácido hialurónico.",
    combination:
      "Tu piel presenta características mixtas. Adapta la rutina a las necesidades de cada zona del rostro.",
    redness:
      "Tu piel muestra enrojecimiento, una señal de sensibilidad. Usa productos calmantes, sin fragancia ni alcohol, y protector solar todos los días.",
    "dry & redness":
      "Tu piel es seca y muestra enrojecimiento: necesita hidratación y cuidado calmante. Prefiere productos suaves con ceramidas y sin fragancia.",
    "oily & redness":
      "Tu piel es grasa y muestra enrojecimiento. Controla el brillo con productos ligeros y calmantes, sin alcohol, y evita exfoliantes agresivos.",
    "combination & redness":
      "Tu piel es mixta y muestra enrojecimiento. Equilibra la grasa en las zonas que la producen y calma las zonas sensibles con productos suaves.",
  },
  t_zone: {
    normal:
      "Tu zona T (frente, nariz y mentón) se ve equilibrada, con una producción de grasa normal. Una limpieza suave y un hidratante ligero la mantienen así.",
    oily: "Tu zona T produce más grasa: es normal ver brillo y poros marcados en frente, nariz y mentón. Limpia sin resecar y usa productos libres de aceite en esta zona.",
    dry: "Tu zona T se ve seca, con poca grasa en frente, nariz y mentón. Hidrata también esta zona y evita los limpiadores agresivos.",
    combination:
      "Tu zona T tiene más grasa y brillo que el resto del rostro, algo típico de la piel mixta. Controla el sebo en frente, nariz y mentón con productos ligeros.",
    redness:
      "Tu zona T muestra enrojecimiento. Evita exfoliantes fuertes en frente, nariz y mentón y prefiere productos calmantes.",
    "dry & redness":
      "Tu zona T se ve seca y con enrojecimiento. Hidrata frente, nariz y mentón con productos suaves que calmen la piel.",
    "oily & redness":
      "Tu zona T tiene exceso de grasa y enrojecimiento. Limpia con suavidad y usa productos ligeros y calmantes en frente, nariz y mentón.",
    "combination & redness":
      "Tu zona T concentra más grasa y muestra enrojecimiento. Controla el brillo sin irritar, con productos suaves y sin alcohol.",
  },
  u_zone: {
    normal:
      "Tu zona U (mejillas y contorno del rostro) se ve equilibrada y bien hidratada. Mantén la hidratación y el protector solar para conservarla.",
    oily: "Tu zona U también muestra exceso de grasa en mejillas y contorno. Prefiere texturas ligeras y evita cremas muy oclusivas.",
    dry: "Tu zona U se ve seca: las mejillas y el contorno pueden sentirse tirantes. Usa un hidratante nutritivo mañana y noche.",
    combination:
      "Tu zona U tiende a ser normal o seca, a diferencia de la zona T. Hidrata bien mejillas y contorno sin usar ahí productos para piel grasa.",
    redness:
      "Tu zona U muestra enrojecimiento en mejillas y contorno. Usa productos suaves que fortalezcan la barrera de la piel y protégela del sol.",
    "dry & redness":
      "Tu zona U se ve seca y con enrojecimiento. Hidrata mejillas y contorno con productos calmantes, sin fragancia.",
    "oily & redness":
      "Tu zona U tiene grasa y enrojecimiento. Usa hidratantes ligeros y calmantes en mejillas y contorno.",
    "combination & redness":
      "Tu zona U muestra enrojecimiento en mejillas y contorno. Calma la zona con productos suaves e hidrátala sin productos para piel grasa.",
  },
};

export const DEFAULT_FITZPATRICK_TEXTS: Record<FitzpatrickScale, string> = {
  I: "Tu piel es de fototipo I: muy clara, casi siempre se quema y nunca se broncea. Usa protector solar de amplio espectro todos los días y evita el sol directo.",
  II: "Tu piel es de fototipo II: clara, suele quemarse y se broncea poco. Usa protector solar a diario y reaplícalo cuando estés al aire libre.",
  III: "Tu piel es de fototipo III: a veces se quema y se broncea poco a poco. El protector solar diario ayuda a prevenir manchas y daño solar.",
  IV: "Tu piel es de fototipo IV: rara vez se quema y se broncea con facilidad. Aun así, el protector solar diario previene manchas y envejecimiento.",
  V: "Tu piel es de fototipo V: muy rara vez se quema. Protégela del sol a diario para prevenir manchas e hiperpigmentación.",
  VI: "Tu piel es de fototipo VI: casi nunca se quema, pero también necesita protector solar para prevenir manchas y daño por radiación.",
};

function isSkinTypeZone(zone: string): zone is SkinTypeTextZone {
  return (SKIN_TYPE_TEXT_ZONES as readonly string[]).includes(zone);
}

function isSkinTypeValue(value: string): value is SkinTypeValue {
  return (ANALISIS_PIEL360_SKIN_TYPE_VALUES as readonly string[]).includes(value);
}

/** Texto del biotipo en esa zona. `null` si la zona o el biotipo no son del
 * catálogo: el cliente pidió no inventar ni asignar uno. */
export function configuredSkinTypeText(
  config: AnalisisPiel360DescriptiveTexts | null | undefined,
  zone: string | null | undefined,
  skinType: string | null | undefined,
): string | null {
  const value = skinType?.trim().toLowerCase() ?? "";
  if (!zone || !isSkinTypeZone(zone) || !isSkinTypeValue(value)) return null;
  return config?.skinTypeTexts?.[zone]?.[value] ?? DEFAULT_SKIN_TYPE_TEXTS[zone][value];
}

export function configuredFitzpatrickText(
  config: AnalisisPiel360DescriptiveTexts | null | undefined,
  scale: FitzpatrickScale,
): string {
  return config?.fitzpatrickTexts?.[scale] ?? DEFAULT_FITZPATRICK_TEXTS[scale];
}

/** Recorta y descarta lo vacío o igual al texto por defecto. */
function cleanText(value: unknown, fallback: string): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().slice(0, DESCRIPTIVE_TEXT_MAX_LENGTH);
  return text && text !== fallback ? text : null;
}

/** Limpia lo que envía el CRM: solo zonas, biotipos y fototipos del catálogo.
 * Sin claves vacías, para que comparar el JSON guardado con el borrador sirva. */
export function sanitizeDescriptiveTexts(input: unknown): AnalisisPiel360DescriptiveTexts {
  const raw = (input ?? {}) as AnalisisPiel360DescriptiveTexts;
  const out: AnalisisPiel360DescriptiveTexts = {};

  const skinTypeTexts: NonNullable<AnalisisPiel360DescriptiveTexts["skinTypeTexts"]> = {};
  for (const zone of SKIN_TYPE_TEXT_ZONES) {
    const zoneTexts: Partial<Record<SkinTypeValue, string>> = {};
    for (const value of ANALISIS_PIEL360_SKIN_TYPE_VALUES) {
      const text = cleanText(raw.skinTypeTexts?.[zone]?.[value], DEFAULT_SKIN_TYPE_TEXTS[zone][value]);
      if (text) zoneTexts[value] = text;
    }
    if (Object.keys(zoneTexts).length) skinTypeTexts[zone] = zoneTexts;
  }
  if (Object.keys(skinTypeTexts).length) out.skinTypeTexts = skinTypeTexts;

  const fitzpatrickTexts: Partial<Record<FitzpatrickScale, string>> = {};
  for (const scale of FITZPATRICK_SCALES) {
    const text = cleanText(raw.fitzpatrickTexts?.[scale], DEFAULT_FITZPATRICK_TEXTS[scale]);
    if (text) fitzpatrickTexts[scale] = text;
  }
  if (Object.keys(fitzpatrickTexts).length) out.fitzpatrickTexts = fitzpatrickTexts;

  return out;
}
