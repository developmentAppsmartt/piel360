import type { NosologyCategory } from '../../../types/nosology';

/**
 * Catálogo estático de nosologías (UI).
 * Después se podrá alimentar desde enciclopedia / Skiniver.
 */
export const NOSOLOGY_CATEGORIES: NosologyCategory[] = [
  {
    id: 'piel-sin-patologia',
    name: 'Piel Sin Patología',
    items: [
      { id: 'piel-normal', name: 'Piel normal' },
      { id: 'variante-fisiologica', name: 'Variante fisiológica' },
    ],
  },
  {
    id: 'lesiones-benignas',
    name: 'Lesiones benignas',
    items: [
      { id: 'nevo', name: 'Nevo melanocítico' },
      { id: 'queratosis-seborreica', name: 'Queratosis seborreica' },
      { id: 'fibroma', name: 'Fibroma blando' },
      { id: 'hemangioma', name: 'Hemangioma' },
    ],
  },
  {
    id: 'precancerosas',
    name: 'Condiciones precancerosas',
    items: [
      { id: 'queratoacantoma', name: 'Queratoacantoma' },
      { id: 'bowen', name: 'Enfermedad de Bowen' },
      { id: 'queratosis-actinica', name: 'Queratosis actínica' },
    ],
  },
  {
    id: 'cancer',
    name: 'Cáncer',
    items: [
      { id: 'bcc', name: 'Carcinoma de células basales' },
      { id: 'scc', name: 'Carcinoma de células escamosas' },
      { id: 'melanoma', name: 'Melanoma' },
      { id: 'lentigo-melanoma', name: 'Lentigo-melanoma' },
    ],
  },
  {
    id: 'hongos',
    name: 'Infecciones por hongos',
    items: [
      { id: 'tinea-corporis', name: 'Tiña corporis' },
      { id: 'candidiasis', name: 'Candidiasis cutánea' },
      { id: 'onicomicosis', name: 'Onicomicosis' },
    ],
  },
  {
    id: 'papuloescamosos',
    name: 'Trastornos papuloescamosos',
    items: [
      { id: 'psoriasis', name: 'Psoriasis' },
      { id: 'liquen-plano', name: 'Liquen plano' },
      { id: 'pitiriasis', name: 'Pitiriasis rosada' },
    ],
  },
  {
    id: 'dermatitis',
    name: 'Dermatitis',
    items: [
      { id: 'dermatitis-atopica', name: 'Dermatitis atópica' },
      { id: 'dermatitis-contacto', name: 'Dermatitis de contacto' },
      { id: 'dermatitis-seborreica', name: 'Dermatitis seborreica' },
    ],
  },
  {
    id: 'virales',
    name: 'Enfermedades Virales',
    items: [
      { id: 'verrugas', name: 'Verrugas víricas' },
      { id: 'molusco', name: 'Molusco contagioso' },
    ],
  },
  {
    id: 'herpesvirus',
    name: 'Infecciones por herpesvirus',
    items: [
      { id: 'herpes-simple', name: 'Herpes simple' },
      { id: 'herpes-zoster', name: 'Herpes zóster' },
    ],
  },
  {
    id: 'acne',
    name: 'Acné',
    items: [
      { id: 'acne-vulgar', name: 'Acné vulgar' },
      { id: 'acne-quistico', name: 'Acné quístico' },
      { id: 'rosacea', name: 'Rosácea' },
    ],
  },
  {
    id: 'eczema',
    name: 'Eczema',
    items: [
      { id: 'eczema-numular', name: 'Eczema numular' },
      { id: 'eczema-disidrotico', name: 'Eczema dishidrótico' },
    ],
  },
];
