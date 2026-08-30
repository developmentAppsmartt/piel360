/** Mock UI — comparación de análisis por paciente (hasta conectar API). */

export type ComparisonCategory = {
  id: string;
  label: string;
  initialScore: number;
  currentScore: number;
  initialDate: string;
  currentDate: string;
  improvement: number;
  improvementLabel: string;
};

export type ComparisonTreatment = {
  id: string;
  label: string;
  doneAt: string;
};

export const MOCK_COMPARISON = {
  initialDate: "15/01/2026, 10:30 a. m.",
  currentDate: "28/08/2026, 11:45 a. m.",
  overallInitial: 59,
  overallCurrent: 78,
  protocol: "Anti-acné + Control de oleosidad",
  protocolStatus: "En progreso",
  routineMorning: 4,
  routineNight: 3,
  categories: [
    {
      id: "hydration",
      label: "Hidratación",
      initialScore: 52,
      currentScore: 74,
      initialDate: "15/01/2026",
      currentDate: "28/08/2026",
      improvement: 22,
      improvementLabel: "Mejora significativa",
    },
    {
      id: "oil",
      label: "Grasa / Oleosidad",
      initialScore: 48,
      currentScore: 71,
      initialDate: "15/01/2026",
      currentDate: "28/08/2026",
      improvement: 23,
      improvementLabel: "Mejora significativa",
    },
    {
      id: "acne",
      label: "Acné",
      initialScore: 41,
      currentScore: 68,
      initialDate: "15/01/2026",
      currentDate: "28/08/2026",
      improvement: 27,
      improvementLabel: "Mejora notable",
    },
    {
      id: "pores",
      label: "Poros",
      initialScore: 55,
      currentScore: 72,
      initialDate: "15/01/2026",
      currentDate: "28/08/2026",
      improvement: 17,
      improvementLabel: "Mejora moderada",
    },
    {
      id: "wrinkles",
      label: "Arrugas",
      initialScore: 62,
      currentScore: 79,
      initialDate: "15/01/2026",
      currentDate: "28/08/2026",
      improvement: 17,
      improvementLabel: "Mejora moderada",
    },
  ] as ComparisonCategory[],
  treatments: [
    { id: "1", label: "Limpieza profunda", doneAt: "20/02/2026" },
    { id: "2", label: "Peeling químico suave", doneAt: "15/04/2026" },
    { id: "3", label: "Control de sebo", doneAt: "10/07/2026" },
  ] as ComparisonTreatment[],
};
