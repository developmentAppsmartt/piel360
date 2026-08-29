/** Mocks UI backoffice — Bolsa de unidades / consumo (hasta conectar API B2B). */

export type UnitPool = {
  id: "aesthetic" | "derm";
  name: string;
  accent: "aesthetic" | "derm";
  available: number;
  total: number;
  used: number;
  reserved: number;
  expiringSoon: number;
  /** Etiqueta de unidad en la tarjeta (unidades vs créditos). */
  unitLabel: "unidades" | "créditos";
};

export type RechargeRow = {
  id: string;
  unitType: "aesthetic" | "derm";
  unitLabel: string;
  rechargedAt: string;
  quantity: number;
  expiresAt: string;
  addedBy: string;
  status: "Activa" | "Vencida";
};

export type ClientUsageRow = {
  id: string;
  name: string;
  plan: string;
  consumed: number;
  accent: "aesthetic" | "derm";
};

export type ActivityItem = {
  id: string;
  clinic: string;
  plan: string;
  deltaLabel: string;
  when: string;
  kind: "purchase" | "clinic";
};

export type ClientRow = {
  id: string;
  name: string;
  url: string;
  initials: string;
  plan: string;
  users: number;
  assigned: number;
  used: number;
  available: number;
  utilization: number;
  lastPurchase: string;
  status: "Activo" | "Inactivo";
};

export type DailyConsumption = {
  date: string;
  aesthetic: number;
  derm: number;
  total: number;
  patients: number;
  professional: string;
};

/** Estético + Fitzpatrick comparten la misma bolsa de unidades. */
export const MOCK_UNIT_POOLS: UnitPool[] = [
  {
    id: "aesthetic",
    name: "Análisis estéticos / Fitzpatrick",
    accent: "aesthetic",
    available: 20694,
    total: 35000,
    used: 14306,
    reserved: 0,
    expiringSoon: 1184,
    unitLabel: "unidades",
  },
  {
    id: "derm",
    name: "Análisis dermatológico (créditos)",
    accent: "derm",
    available: 22375,
    total: 30000,
    used: 7625,
    reserved: 0,
    expiringSoon: 1120,
    unitLabel: "créditos",
  },
];

export const MOCK_RECHARGES: RechargeRow[] = [
  {
    id: "1",
    unitType: "aesthetic",
    unitLabel: "Análisis estéticos / Fitzpatrick",
    rechargedAt: "20/05/2026, 10:30 a. m.",
    quantity: 5000,
    expiresAt: "20/05/2027",
    addedBy: "Super Admin",
    status: "Activa",
  },
  {
    id: "2",
    unitType: "derm",
    unitLabel: "Análisis dermatológico",
    rechargedAt: "18/05/2026, 03:15 p. m.",
    quantity: 3000,
    expiresAt: "18/05/2027",
    addedBy: "Super Admin",
    status: "Activa",
  },
  {
    id: "3",
    unitType: "aesthetic",
    unitLabel: "Análisis estéticos / Fitzpatrick",
    rechargedAt: "15/05/2026, 09:00 a. m.",
    quantity: 2500,
    expiresAt: "15/05/2027",
    addedBy: "Super Admin",
    status: "Activa",
  },
  {
    id: "4",
    unitType: "derm",
    unitLabel: "Análisis dermatológico",
    rechargedAt: "10/05/2026, 11:45 a. m.",
    quantity: 4000,
    expiresAt: "10/05/2027",
    addedBy: "Super Admin",
    status: "Activa",
  },
  {
    id: "5",
    unitType: "aesthetic",
    unitLabel: "Análisis estéticos / Fitzpatrick",
    rechargedAt: "05/05/2026, 02:20 p. m.",
    quantity: 1500,
    expiresAt: "05/05/2027",
    addedBy: "Super Admin",
    status: "Activa",
  },
  {
    id: "6",
    unitType: "derm",
    unitLabel: "Análisis dermatológico",
    rechargedAt: "01/05/2026, 08:00 a. m.",
    quantity: 2000,
    expiresAt: "01/05/2027",
    addedBy: "Super Admin",
    status: "Activa",
  },
  {
    id: "7",
    unitType: "aesthetic",
    unitLabel: "Análisis estéticos / Fitzpatrick",
    rechargedAt: "28/04/2026, 04:50 p. m.",
    quantity: 1000,
    expiresAt: "28/04/2027",
    addedBy: "Super Admin",
    status: "Activa",
  },
];

export const MOCK_CLIENT_USAGE: ClientUsageRow[] = [
  {
    id: "1",
    name: "Clínica Piel Sana",
    plan: "Plan Estético Pro",
    consumed: 1250,
    accent: "aesthetic",
  },
  {
    id: "2",
    name: "DermaCenter Bogotá",
    plan: "Plan Dermatológico",
    consumed: 980,
    accent: "derm",
  },
  {
    id: "3",
    name: "Perfect Clinic",
    plan: "Plan Mixto",
    consumed: 850,
    accent: "aesthetic",
  },
  {
    id: "4",
    name: "SkinLab Medellín",
    plan: "Plan Estético Pro",
    consumed: 620,
    accent: "aesthetic",
  },
  {
    id: "5",
    name: "Nova Derma",
    plan: "Plan Dermatológico",
    consumed: 540,
    accent: "derm",
  },
];

export function unitDistribution() {
  const total = MOCK_UNIT_POOLS.reduce((sum, p) => sum + p.available, 0);
  return MOCK_UNIT_POOLS.map((p) => ({
    id: p.id,
    label: p.name,
    value: p.available,
    percent: total > 0 ? (p.available / total) * 100 : 0,
    accent: p.accent,
  }));
}

export const MOCK_USAGE_SERIES = {
  aesthetic: [120, 180, 210, 260, 310, 380, 420, 480, 520, 610],
  derm: [80, 95, 110, 140, 160, 190, 220, 250, 280, 340],
  labels: ["30d", "", "", "", "15d", "", "", "", "", "Hoy"],
};

export const MOCK_ACTIVITY: ActivityItem[] = [
  {
    id: "1",
    clinic: "Clínica Piel Sana",
    plan: "Plan Estético Pro",
    deltaLabel: "-500 unidades estéticas / Fitzpatrick",
    when: "Hace 12 min",
    kind: "purchase",
  },
  {
    id: "2",
    clinic: "DermaCenter Bogotá",
    plan: "Plan Dermatológico",
    deltaLabel: "-200 créditos derm.",
    when: "Hace 45 min",
    kind: "clinic",
  },
  {
    id: "3",
    clinic: "Perfect Clinic",
    plan: "Plan Mixto",
    deltaLabel: "-150 unidades estéticas / Fitzpatrick",
    when: "Hace 2 h",
    kind: "purchase",
  },
  {
    id: "4",
    clinic: "SkinLab Medellín",
    plan: "Plan Estético Pro",
    deltaLabel: "-80 unidades estéticas / Fitzpatrick",
    when: "Hace 5 h",
    kind: "clinic",
  },
];

export const MOCK_CLIENTS: ClientRow[] = [
  {
    id: "1",
    name: "Perfect Clinic",
    url: "perfectclinic.com",
    initials: "PC",
    plan: "Estético Pro",
    users: 12,
    assigned: 2000,
    used: 820,
    available: 1180,
    utilization: 41,
    lastPurchase: "02/07/2026 14:20",
    status: "Activo",
  },
  {
    id: "2",
    name: "Clínica Piel Sana",
    url: "pielsana.co",
    initials: "PS",
    plan: "Estético Pro",
    users: 8,
    assigned: 1500,
    used: 1100,
    available: 400,
    utilization: 73,
    lastPurchase: "28/06/2026 09:10",
    status: "Activo",
  },
  {
    id: "3",
    name: "DermaCenter Bogotá",
    url: "dermacenter.co",
    initials: "DC",
    plan: "Mixto",
    users: 15,
    assigned: 3000,
    used: 900,
    available: 2100,
    utilization: 30,
    lastPurchase: "01/07/2026 18:45",
    status: "Activo",
  },
  {
    id: "4",
    name: "SkinLab Medellín",
    url: "skinlab.co",
    initials: "SL",
    plan: "Estético Base",
    users: 5,
    assigned: 800,
    used: 640,
    available: 160,
    utilization: 80,
    lastPurchase: "15/06/2026 11:00",
    status: "Activo",
  },
  {
    id: "5",
    name: "Nova Derma",
    url: "novaderma.com",
    initials: "ND",
    plan: "Estético Pro",
    users: 9,
    assigned: 1800,
    used: 450,
    available: 1350,
    utilization: 25,
    lastPurchase: "05/07/2026 08:30",
    status: "Activo",
  },
  {
    id: "6",
    name: "Aura Skin",
    url: "auraskin.co",
    initials: "AS",
    plan: "Dermatológico",
    users: 6,
    assigned: 1000,
    used: 200,
    available: 800,
    utilization: 20,
    lastPurchase: "20/06/2026 16:15",
    status: "Activo",
  },
  {
    id: "7",
    name: "Clínica Horizonte",
    url: "horizonte.med",
    initials: "CH",
    plan: "Mixto",
    users: 11,
    assigned: 2200,
    used: 1540,
    available: 660,
    utilization: 70,
    lastPurchase: "30/06/2026 12:00",
    status: "Activo",
  },
  {
    id: "8",
    name: "DermaPlus Cali",
    url: "dermaplus.co",
    initials: "DP",
    plan: "Estético Base",
    users: 4,
    assigned: 600,
    used: 120,
    available: 480,
    utilization: 20,
    lastPurchase: "04/07/2026 10:40",
    status: "Activo",
  },
];

export const MOCK_COMPANY_CONSUMPTION = {
  company: "Perfect Clinic",
  companyId: "EMP-1258",
  aesthetic: { done: 35, limit: 200, available: 165 },
  derm: { done: 12, limit: 100, available: 88 },
  daily: [
    { date: "01/07", aesthetic: 4, derm: 1 },
    { date: "02/07", aesthetic: 6, derm: 2 },
    { date: "03/07", aesthetic: 3, derm: 0 },
    { date: "04/07", aesthetic: 8, derm: 3 },
    { date: "05/07", aesthetic: 5, derm: 2 },
    { date: "06/07", aesthetic: 5, derm: 3 },
    { date: "07/07", aesthetic: 4, derm: 1 },
  ],
  rows: [
    {
      date: "07/07/2026",
      aesthetic: 4,
      derm: 1,
      total: 5,
      patients: 4,
      professional: "Dra. Ana López",
    },
    {
      date: "06/07/2026",
      aesthetic: 5,
      derm: 3,
      total: 8,
      patients: 8,
      professional: "Dra. Ana López",
    },
    {
      date: "05/07/2026",
      aesthetic: 5,
      derm: 2,
      total: 7,
      patients: 6,
      professional: "Dra. Ana López",
    },
    {
      date: "04/07/2026",
      aesthetic: 8,
      derm: 3,
      total: 11,
      patients: 9,
      professional: "Dr. Carlos Méndez",
    },
    {
      date: "03/07/2026",
      aesthetic: 3,
      derm: 0,
      total: 3,
      patients: 3,
      professional: "Dra. Ana López",
    },
    {
      date: "02/07/2026",
      aesthetic: 6,
      derm: 2,
      total: 8,
      patients: 7,
      professional: "Dra. Ana López",
    },
    {
      date: "01/07/2026",
      aesthetic: 4,
      derm: 1,
      total: 5,
      patients: 5,
      professional: "Dr. Carlos Méndez",
    },
  ] as DailyConsumption[],
};
