/**
 * Rangos de puntuación del análisis estético (Configuración → Personalización).
 *
 * El profesional o la empresa puede, por métrica, mover los límites de
 * Regular / Promedio / Buena y reemplazar el texto de cada nivel.
 * Lo que no se configura usa los valores de este archivo.
 */
import {
  YOUCAM_MAIN_METRIC_TYPES,
  type YoucamScoreBand,
} from "./youcam-report.js";

export const YOUCAM_SCORE_BANDS: readonly YoucamScoreBand[] = [
  "regular",
  "promedio",
  "buena",
];

/** Métricas que se configuran (una por tipo de análisis estético). */
export const YOUCAM_SCORE_CONFIG_METRICS: readonly string[] = YOUCAM_MAIN_METRIC_TYPES;

/** Puntaje < regularMax → Regular; < promedioMax → Promedio; resto → Buena. */
export const DEFAULT_SCORE_RANGES = { regularMax: 70, promedioMax: 90 } as const;

export type YoucamBandTexts = Partial<Record<YoucamScoreBand, string | null>>;

/** Lo que guarda la cuenta por métrica; todo opcional (= valor por defecto). */
export type YoucamMetricScoreConfig = {
  /** Puntaje desde el que empieza Promedio (Regular = 0 … regularMax − 1). */
  regularMax?: number | null;
  /** Puntaje desde el que empieza Buena (Promedio = regularMax … promedioMax − 1). */
  promedioMax?: number | null;
  texts?: YoucamBandTexts;
};

export type YoucamScoreConfig = {
  metrics: Record<string, YoucamMetricScoreConfig>;
};

export const DEFAULT_YOUCAM_SCORE_CONFIG: YoucamScoreConfig = { metrics: {} };

/** Consejos accionables por nivel (estilo reporte Perfect). */
export const YOUCAM_DEFAULT_ADVICE: Record<string, Record<YoucamScoreBand, string>> = {
  hd_wrinkle: {
    regular:
      "La exposición solar acelera las arrugas. Usa protector solar SPF 30 o superior a diario y reaplícalo. Un retinoide nocturno puede ayudar bajo supervisión profesional.",
    promedio:
      "Vas por buen camino. Refuerza SPF a diario y considera un sérum con péptidos o retinol suave para mejorar la apariencia de las líneas.",
    buena:
      "¡Se ve muy bien! Mantén el SPF para proteger esa piel suave y evita hábitos que sequen o irradien el rostro.",
  },
  hd_age_spot: {
    regular:
      "Las manchas suelen relacionarse con el sol. Prioriza SPF diario y consulta opciones de despigmentación (vitamina C, niacinamida) con tu dermatólogo.",
    promedio:
      "Hay algo de pigmentación. Un antioxidante por la mañana y SPF constante ayudan a uniformar el tono con el tiempo.",
    buena:
      "Tu tono se ve uniforme. Sigue con protección solar para evitar nuevas manchas.",
  },
  hd_texture: {
    regular:
      "La textura irregular mejora con hidratación constante y exfoliación suave (AHA/BHA) 1–2 veces por semana, según tolerancia.",
    promedio:
      "Un poco de cuidado extra puede alisar zonas ásperas: hidratante rico y exfoliación suave ocasional.",
    buena:
      "La superficie se ve pareja. Mantén hidratación y SPF para conservar ese acabado.",
  },
  hd_dark_circle: {
    regular:
      "Las ojeras mejoran con sueño, menos sal y un contorno con cafeína o vitamina K. Si persisten, valora valoración clínica.",
    promedio:
      "Un contorno de ojos hidratante y descanso regular pueden suavizar la zona periocular.",
    buena:
      "La zona bajo los ojos se ve descansada. Mantén la rutina de contorno y descanso.",
  },
  hd_firmness: {
    regular:
      "La firmeza responde a SPF, hábitos saludables y activos como péptidos o retinoides. Evita el tabaco y la deshidratación.",
    promedio:
      "Un sérum reafirmante y masajes faciales suaves pueden apoyar el contorno con el tiempo.",
    buena: "Buen tono y soporte cutáneo. Mantén hidratación y protección solar.",
  },
  hd_pore: {
    regular:
      "Limpieza suave dos veces al día y niacinamida ayudan a que los poros se vean menos. Evita productos comedogénicos.",
    promedio:
      "Equilibra grasa e hidratación: limpia sin resecar y usa un tónico con BHA si tu piel lo tolera.",
    buena:
      "Los poros se ven controlados. Mantén una limpieza consistente y no abuses de la exfoliación.",
  },
  hd_acne: {
    regular:
      "Mantén una rutina suave (limpiador + hidratante no graso). Evita exprimir lesiones y consulta si el acné es inflamatorio.",
    promedio:
      "Controla el exceso de grasa sin resecar. Un tratamiento local con ácido salicílico puede ayudar en brotes leves.",
    buena:
      "Pocos signos de acné. Sigue una rutina limpia y no abrasiva para prevenir brotes.",
  },
  hd_moisture: {
    regular:
      "Tu piel parece necesitar más agua. Usa un hidratante con humectantes (glicerina, ácido hialurónico) mañana y noche.",
    promedio:
      "Un poco más de hidratación podría mejorar la suavidad. No olvides beber agua y usar crema tras limpiar.",
    buena:
      "Buen nivel de hidratación aparente. Mantén tu crema habitual y ajusta en climas secos.",
  },
  hd_oiliness: {
    regular:
      "Exceso de brillo: limpia con gel suave, evita cremas muy oclusivas y prueba niacinamida para equilibrar sebo.",
    promedio: "Brillo moderado. Usa hidratante en gel y un protector oil-free.",
    buena: "Sebo bien controlado. Mantén la rutina equilibrada sin resecar.",
  },
  hd_radiance: {
    regular:
      "Para más luminosidad: exfoliación suave, vitamina C por la mañana y buena hidratación.",
    promedio: "Un boost de antioxidantes y SPF puede potenciar el brillo saludable.",
    buena: "La piel se ve luminosa. Mantén antioxidantes y protección solar.",
  },
  hd_redness: {
    regular:
      "Prioriza productos calmantes (centella, ceramidas) y evita alcohol/fragancias. Usa SPF mineral si hay sensibilidad.",
    promedio:
      "Calma la piel con hidratantes barrera y reduce exfoliantes fuertes unos días.",
    buena: "Poco enrojecimiento. Sigue con productos suaves y protección solar.",
  },
  hd_eye_bag: {
    regular:
      "Reduce sal y eleva la cabecera al dormir. Contornos fríos y cafeína pueden aliviar temporalmente.",
    promedio:
      "Descanso y drenaje suave ayudan. Mantén el contorno de ojos hidratante.",
    buena: "Poca evidencia de bolsas. Mantén hábitos de sueño y cuidado periocular.",
  },
  hd_tear_trough: {
    regular:
      "Hidrata el contorno y evita frotar. Si el surco es profundo, un especialista puede orientar opciones.",
    promedio: "Un contorno nutritivo y SPF ayudan a que la zona se vea más uniforme.",
    buena: "El contorno se ve suave. Mantén la rutina periocular.",
  },
  hd_droopy_upper_eyelid: {
    regular:
      "La flacidez del párpado superior suele ser multifactorial. SPF y hábitos saludables ayudan; valora valoración clínica si molesta.",
    promedio: "Mantén el contorno hidratado y protección solar en la zona ocular.",
    buena: "Buen soporte del párpado superior. Continúa con cuidado suave.",
  },
  hd_droopy_lower_eyelid: {
    regular:
      "Cuida la zona con contorno hidratante y evita tirones. Consulta si hay cambios notables.",
    promedio: "Hidratación y descanso apoyan el contorno inferior.",
    buena: "El párpado inferior se ve firme. Mantén tu rutina actual.",
  },
  hd_skin_type: {
    regular:
      "Adapta limpiador e hidratante a tu tipo de piel y evita productos que la desequilibren.",
    promedio:
      "Elige productos acordes a tu tipo (grasa, seca o mixta) para mantener el equilibrio.",
    buena:
      "Tu tipo de piel está bien caracterizado. Mantén una rutina coherente con él.",
  },
};

export const YOUCAM_FALLBACK_ADVICE: Record<YoucamScoreBand, string> = {
  regular:
    "Con un poco más de cuidado enfocado puedes mejorar esta área. Revisa la rutina y la protección solar diaria.",
  promedio:
    "Vas en buen camino. Pequeños ajustes en hidratación y SPF pueden llevarte al siguiente nivel.",
  buena: "¡Excelente resultado en esta métrica! Mantén tu rutina y la protección solar.",
};

export function defaultYoucamAdvice(
  type: string | null | undefined,
  band: YoucamScoreBand,
): string {
  return (type && YOUCAM_DEFAULT_ADVICE[type]?.[band]) || YOUCAM_FALLBACK_ADVICE[band];
}

export type ResolvedScoreRanges = { regularMax: number; promedioMax: number };

export function resolveScoreRanges(
  config: YoucamScoreConfig | null | undefined,
  type: string | null | undefined,
): ResolvedScoreRanges {
  const m = (type && config?.metrics?.[type]) || {};
  return {
    regularMax: m.regularMax ?? DEFAULT_SCORE_RANGES.regularMax,
    promedioMax: m.promedioMax ?? DEFAULT_SCORE_RANGES.promedioMax,
  };
}

export function configuredYoucamScoreBand(
  score: number,
  type: string | null | undefined,
  config: YoucamScoreConfig | null | undefined,
): YoucamScoreBand {
  const { regularMax, promedioMax } = resolveScoreRanges(config, type);
  if (score < regularMax) return "regular";
  if (score < promedioMax) return "promedio";
  return "buena";
}

/** Texto del nivel: el configurado o el texto por defecto. */
export function configuredYoucamAdvice(
  type: string | null | undefined,
  band: YoucamScoreBand,
  config: YoucamScoreConfig | null | undefined,
): string {
  const custom = type ? config?.metrics?.[type]?.texts?.[band] : null;
  return custom?.trim() ? custom : defaultYoucamAdvice(type, band);
}

/** Valida y limpia lo que envía el CRM; lanza un mensaje legible si algo no cuadra. */
export function sanitizeYoucamScoreConfig(input: unknown): YoucamScoreConfig {
  const raw = (input ?? {}) as Partial<YoucamScoreConfig>;
  const int = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null;
  const metrics: Record<string, YoucamMetricScoreConfig> = {};
  for (const type of YOUCAM_SCORE_CONFIG_METRICS) {
    const m = raw.metrics?.[type];
    if (!m) continue;
    const reg = int(m.regularMax) ?? DEFAULT_SCORE_RANGES.regularMax;
    const prom = int(m.promedioMax) ?? DEFAULT_SCORE_RANGES.promedioMax;
    if (reg < 1 || prom > 100 || reg >= prom) {
      throw new Error(
        "Regular, Promedio y Buena deben ir en orden y cada uno tener al menos un punto.",
      );
    }
    const entry: YoucamMetricScoreConfig = {};
    if (reg !== DEFAULT_SCORE_RANGES.regularMax) entry.regularMax = reg;
    if (prom !== DEFAULT_SCORE_RANGES.promedioMax) entry.promedioMax = prom;
    const texts: YoucamBandTexts = {};
    for (const band of YOUCAM_SCORE_BANDS) {
      const value = m.texts?.[band];
      if (typeof value === "string" && value.trim()) {
        texts[band] = value.trim().slice(0, 1000);
      }
    }
    if (Object.keys(texts).length) entry.texts = texts;
    if (Object.keys(entry).length) metrics[type] = entry;
  }
  return { metrics };
}
