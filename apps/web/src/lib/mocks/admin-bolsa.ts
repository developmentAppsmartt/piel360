/** Mocks UI backoffice — Bolsa de unidades / consumo (hasta conectar API B2B). */

export type UnitPool = {
  id: string;
  name: string;
  accent: "aesthetic" | "derm";
  available: number;
  total: number;
  used: number;
  reserved: number;
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

export const MOCK_UNIT_POOLS: UnitPool[] = [
  {
    id: "aesthetic",
    name: "Análisis de piel estéticos",
    accent: "aesthetic",
    available: 12458,
    total: 20000,
    used: 7542,
    reserved: 0,
  },
  {
    id: "derm",
    name: "Análisis de imágenes dermatológicas",
    accent: "derm",
    available: 8236,
    total: 15000,
    used: 6764,
    reserved: 0,
  },
];

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
    deltaLabel: "-500 unidades estéticas",
    when: "Hace 12 min",
    kind: "purchase",
  },
  {
    id: "2",
    clinic: "DermaCenter Bogotá",
    plan: "Plan Dermatológico",
    deltaLabel: "-200 unidades derm.",
    when: "Hace 45 min",
    kind: "clinic",
  },
  {
    id: "3",
    clinic: "Perfect Clinic",
    plan: "Plan Mixto",
    deltaLabel: "-150 unidades estéticas",
    when: "Hace 2 h",
    kind: "purchase",
  },
  {
    id: "4",
    clinic: "SkinLab Medellín",
    plan: "Plan Estético Pro",
    deltaLabel: "-80 unidades estéticas",
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
