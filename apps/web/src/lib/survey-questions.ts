// Port literal de Piel360/app/Filament/Patient/Pages/Encuesta.php#getQuestionsProperty
// — mismas 10 preguntas/keys/opciones que la encuesta obligatoria del Laravel viejo.
export interface SurveyQuestion {
  key: string;
  question: string;
  options: { value: string; label: string }[];
}

export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    key: "goal",
    question: "¿Cuál es tu principal objetivo en el cuidado de la piel?",
    options: [
      { value: "risk_check", label: "Revisión de riesgo de enfermedades cutáneas" },
      { value: "mole_monitor", label: "Monitoreo de lunares/detección temprana de cáncer" },
      { value: "acne", label: "Tratar o prevenir el acné" },
      { value: "texture", label: "Mejorar textura y tono de piel" },
      { value: "anti_aging", label: "Reducir arrugas o manchas visibles" },
    ],
  },
  {
    key: "skin_type",
    question: "¿Cómo describirías tu tipo de piel?",
    options: [
      { value: "normal", label: "Normal" },
      { value: "dry", label: "Seca" },
      { value: "oily", label: "Grasa" },
      { value: "mixed", label: "Mixta" },
      { value: "sensitive", label: "Sensible" },
    ],
  },
  {
    key: "fitzpatrick_type",
    question: "¿Cuál es tu fototipo de piel?",
    options: [
      { value: "I", label: "Tipo I (Muy clara)" },
      { value: "II", label: "Tipo II (Clara)" },
      { value: "III", label: "Tipo III (Clara a intermedia)" },
      { value: "IV", label: "Tipo IV (Intermedia)" },
      { value: "V", label: "Tipo V (Oscura)" },
      { value: "VI", label: "Tipo VI (Muy oscura)" },
    ],
  },
  {
    key: "sunscreen_usage",
    question: "¿Usas protector solar regularmente?",
    options: [
      { value: "always", label: "Siempre" },
      { value: "vacation", label: "Solo en playa o vacaciones" },
      { value: "sometimes", label: "A veces" },
      { value: "never", label: "Nunca" },
    ],
  },
  {
    key: "sun_exposure",
    question: "¿Con qué frecuencia te expones al sol?",
    options: [
      { value: "low", label: "Baja" },
      { value: "medium", label: "Media" },
      { value: "high", label: "Alta" },
    ],
  },
  {
    key: "family_history",
    question: "¿Antecedentes familiares de problemas de piel?",
    options: [
      { value: "yes", label: "Sí" },
      { value: "no", label: "No" },
      { value: "unknown", label: "No sé" },
    ],
  },
  {
    key: "mascot_type",
    question: "¿Tienes mascotas?",
    options: [
      { value: "none", label: "No" },
      { value: "dog", label: "Perro" },
      { value: "cat", label: "Gato" },
      { value: "other", label: "Otro" },
    ],
  },
  {
    key: "allergies",
    question: "¿Tienes alergias conocidas?",
    options: [
      { value: "yes", label: "Sí" },
      { value: "no", label: "No" },
    ],
  },
  {
    key: "smoking",
    question: "¿Fumas?",
    options: [
      { value: "yes", label: "Sí" },
      { value: "no", label: "No" },
      { value: "socially", label: "Socialmente" },
    ],
  },
  {
    key: "water_intake",
    question: "¿Cuánta agua bebes al día?",
    options: [
      { value: "less_1l", label: "Menos de 1L" },
      { value: "1_2l", label: "1-2 Litros" },
      { value: "more_2l", label: "Más de 2 Litros" },
    ],
  },
];

// Port de fitzpatrick-selector.blade.php — usado en el paso de fototipo.
export const FITZPATRICK_DESCRIPTIONS: Record<string, string> = {
  I: "Piel muy clara, siempre se quema, nunca se broncea. Máxima sensibilidad.",
  II: "Piel clara, siempre se quema, a veces se broncea. Muy sensible.",
  III: "Piel trigueña clara, a veces se quema, siempre se broncea. Sensibilidad media.",
  IV: "Piel trigueña oscura, rara vez se quema, siempre se broncea. Poca sensibilidad.",
  V: "Piel oscura, muy rara vez se quema, siempre se broncea. Muy poca sensibilidad.",
  VI: "Piel negra, nunca se quema, siempre se broncea. Insensible al sol.",
};
