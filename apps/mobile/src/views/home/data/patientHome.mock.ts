/** Mocks del home paciente hasta conectar el API de análisis / perfil. */

export type MockAnalysisTone = 'danger' | 'warning' | 'success';

export type MockAnalysisItem = {
  id: string;
  title: string;
  dateLabel: string;
  doctor?: string;
  tone: MockAnalysisTone;
  /** Color placeholder del thumb (sin imagen real aún). */
  thumbColor: string;
};

export const MOCK_PATIENT_HOME = {
  displayName: 'Ivan Granados',
  lastUpdate: '12-07-2025',
  document: 'CC 83558780',
  ageLabel: 'Edad: 39 Años',
  initials: 'IG',
  notificationCount: 11,
};

export const MOCK_ANALYSES: MockAnalysisItem[] = [
  {
    id: '1',
    title: 'Enfermedad de Bowen',
    dateLabel: '01/12/2025 12:55',
    doctor: 'Médico: —',
    tone: 'danger',
    thumbColor: '#FECACA',
  },
  {
    id: '2',
    title: 'Halo nevo',
    dateLabel: '12/11/2025 12:55',
    tone: 'danger',
    thumbColor: '#FDE68A',
  },
  {
    id: '3',
    title: 'Nevus azul',
    dateLabel: '20/10/2025 12:55',
    tone: 'warning',
    thumbColor: '#BFDBFE',
  },
  {
    id: '4',
    title: 'Acné quístico',
    dateLabel: '01/09/2025 12:55',
    tone: 'success',
    thumbColor: '#BBF7D0',
  },
  {
    id: '5',
    title: 'Enfermedad de Bowen',
    dateLabel: '01/08/2025 12:55',
    tone: 'danger',
    thumbColor: '#FECACA',
  },
  {
    id: '6',
    title: 'Acné pustuloso',
    dateLabel: '01/05/2025 12:55',
    tone: 'danger',
    thumbColor: '#FED7AA',
  },
];
