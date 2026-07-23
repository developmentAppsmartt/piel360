import type { AppIconName } from '../components/icons';
import { Icons } from '../components/icons';

export const PATIENT_GENDER_OPTIONS = [
  { value: 'female', label: 'Femenino' },
  { value: 'male', label: 'Masculino' },
  { value: 'other', label: 'Otro' },
] as const;

export const PATIENT_DOC_TYPES = ['CC', 'CE', 'TI', 'PA'] as const;

export const PATIENT_MASCOT_OPTIONS: {
  value: string;
  label: string;
  icon: AppIconName;
}[] = [
  { value: 'dog', label: 'Perro', icon: Icons.dog },
  { value: 'cat', label: 'Gato', icon: Icons.cat },
  { value: 'other', label: 'Otro', icon: Icons.paw },
  { value: 'none', label: 'Ninguna', icon: Icons.close },
];

export const PATIENT_SKIN_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'dry', label: 'Seca' },
  { value: 'oily', label: 'Grasa' },
  { value: 'mixed', label: 'Mixta' },
] as const;

export const PATIENT_FITZ_OPTIONS = [
  {
    value: 'I',
    color: '#F8E4D4',
    hint: 'Piel muy clara, siempre se quema, nunca se broncea.',
  },
  {
    value: 'II',
    color: '#E8C4A8',
    hint: 'Piel clara, suele quemarse, bronceado mínimo.',
  },
  {
    value: 'III',
    color: '#D1A074',
    hint: 'Clara a intermedia, a veces se quema.',
  },
  {
    value: 'IV',
    color: '#A67C52',
    hint: 'Intermedia, rara vez se quema.',
  },
  {
    value: 'V',
    color: '#8D5524',
    hint: 'Oscura, casi nunca se quema.',
  },
  {
    value: 'VI',
    color: '#5C3317',
    hint: 'Muy oscura, nunca se quema.',
  },
] as const;
