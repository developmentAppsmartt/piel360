/**
 * Catálogo de la lista con la que el profesional corrige un diagnóstico
 * dermatológico: grupos de patologías (`name` = la categoría que devuelve la
 * IA) y sus condiciones. El `id` de cada condición es el id del clasificador
 * (`class_raw`, p. ej. `2A_acne_pustular`), el mismo que traen los
 * diagnósticos de la IA: por eso un diagnóstico corregido cuenta en los
 * reportes igual que uno de la IA.
 *
 * Espejo en apps/mobile/src/views/nosologies/data/nosologies.ts (el móvil no
 * puede importar este paquete): si cambias uno, cambia el otro.
 */
import { normalizeLabelKey } from "./skiniver-diagnosis-taxonomy.js";

export type NosologyItem = {
  id: string;
  name: string;
};

export type NosologyCategory = {
  id: string;
  name: string;
  items: NosologyItem[];
};

export const NOSOLOGY_CATEGORIES: readonly NosologyCategory[] = [
  {
    id: "piel-sin-patologia",
    name: "Piel Sin Patología",
    items: [
      { id: "1B_skin", name: "Piel Sin Patología" },
    ],
  },
  {
    id: "lesiones-benignas",
    name: "Lesiones benignas",
    items: [
      { id: "1B_acral_nevus", name: "Nevus acral" },
      { id: "1B_benign_nevus", name: "Nevus benigno" },
      { id: "1B_dermatofibroma", name: "Dermatofibroma" },
      { id: "1B_halo_nevus", name: "Halo nevo" },
      { id: "1B_hemangioma", name: "Hemangioma" },
      { id: "1B_papiloma_nevus", name: "Nevus papilomatoso" },
      { id: "1B_pyogenic_granuloma", name: "Granuloma piógeno" },
      { id: "1B_spitz_nevus", name: "Nevo de Spitz" },
      { id: "2P_blue_nevus", name: "Nevus azul" },
      { id: "2P_lentigo", name: "Lentigo" },
      { id: "2P_seborrheic_keratosis", name: "Queratosis seborreica" },
      { id: "3V_papiloma", name: "Papiloma" },
    ],
  },
  {
    id: "acne",
    name: "Acné",
    items: [
      { id: "2A_acne_cystic", name: "Acné quístico" },
      { id: "2A_acne_pustular", name: "Acné pustuloso" },
      { id: "2A_acne_vulgaris", name: "Acné común" },
      { id: "2A_comedone_closed", name: "Comedón Cerrado" },
      { id: "2A_comedone_open", name: "Comedón Abierto" },
      { id: "2A_milium", name: "Milio" },
      { id: "2A_rosacea", name: "Rosácea" },
    ],
  },
  {
    id: "infecciones-por-hongos",
    name: "Infecciones por hongos",
    items: [
      { id: "2G_onychomycosis", name: "onicomicosis" },
      { id: "2G_pityriasis_versicolor", name: "Pitiriasis versicolor" },
      { id: "2G_skin_mycosis", name: "Micosis de la piel" },
      { id: "2G_trichomycosis", name: "tricomicosis" },
    ],
  },
  {
    id: "condiciones-precancerosas",
    name: "Condiciones precancerosas",
    items: [
      { id: "2P_actinic_keratosis", name: "Queratosis actínica" },
      { id: "2P_dysplastic_nevus", name: "Nevus displásico" },
    ],
  },
  {
    id: "cancer",
    name: "Cáncer",
    items: [
      { id: "2P_bouen", name: "Enfermedad de Bowen" },
      { id: "2P_keratoakantoma", name: "Queratoacantoma" },
      { id: "3C_basal_cell_carcinoma", name: "Carcinoma de células basales" },
      { id: "3C_lentigo_melanoma", name: "Lentigo-melanoma" },
      { id: "3C_melanoma", name: "Melanoma" },
      { id: "3C_squamous_cell_carcinoma", name: "Carcinoma de células escamosas" },
    ],
  },
  {
    id: "trastornos-papuloescamosos",
    name: "Trastornos papuloescamosos",
    items: [
      { id: "2PS_lichen_planus", name: "Liquen plano" },
      { id: "2PS_linear_lichen", name: "Liquen lineal" },
      { id: "2PS_pink_lichen", name: "Liquen rosa" },
      { id: "2PS_psoriasis_pustular", name: "Psoriasis pustulosa" },
      { id: "2PS_psoriasis_vulgar", name: "Psoriasis vulgar" },
      { id: "2PS_red_hair_lichen", name: "Pitiriasis Rubra Pilaris Devergie" },
      { id: "2PS_shining_versicolor", name: "Versicolor brillante" },
    ],
  },
  {
    id: "dermatitis",
    name: "Dermatitis",
    items: [
      { id: "2PS_seborrheic_dermatitis", name: "Dermatitis seborreica" },
      { id: "4D_atopic_dermatitis", name: "Dermatitis atópica" },
      { id: "4D_dermatitis", name: "Dermatitis" },
    ],
  },
  {
    id: "infecciones-por-herpesvirus",
    name: "Infecciones por herpesvirus",
    items: [
      { id: "3V_herpes_genitalis", name: "herpes genital" },
      { id: "3V_herpes_simplex", name: "Herpes Simple" },
      { id: "3V_herpes_varicella_zoster", name: "Varicela Zoster" },
      { id: "3V_herpes_zoster", name: "Infección de herpes" },
    ],
  },
  {
    id: "enfermedades-virales",
    name: "Enfermedades Virales",
    items: [
      { id: "3V_molluscum_contagiosum", name: "Molusco contagioso" },
      { id: "3V_wart_plane", name: "Avión de verrugas" },
      { id: "3V_wart_plantar", name: "verruga plantar" },
      { id: "3V_wart_vulgaris", name: "verruga vulgar" },
    ],
  },
  {
    id: "eczema",
    name: "Eczema",
    items: [
      { id: "4E_eczema", name: "Eczema" },
    ],
  },
  {
    id: "eritema-anular-centrifugo",
    name: "Eritema anular centrífugo",
    items: [
      { id: "4HE_erythema", name: "Eritema anular centrífugo" },
    ],
  },
  {
    id: "urticaria-alergica",
    name: "Urticaria alérgica",
    items: [
      { id: "4HE_hives", name: "Urticaria alérgica" },
    ],
  },
  {
    id: "lesiones-benignas-2",
    name: "Lesiones benignas",
    items: [
      { id: "1B_nails", name: "Uñas Sin Patología" },
    ],
  },
  {
    id: "hidradenitis-supurativa",
    name: "Hidradenitis supurativa",
    items: [
      { id: "4HE_hidradenitis", name: "Hidradenitis supurativa" },
    ],
  },
  {
    id: "vitiligo",
    name: "Vitíligo",
    items: [
      { id: "4HE_vitiligo", name: "Vitíligo" },
    ],
  },
];

export type NosologyMatch = { item: NosologyItem; category: NosologyCategory };

export function findNosologyByCode(code?: string | null): NosologyMatch | null {
  const id = code?.trim();
  if (!id) return null;
  for (const category of NOSOLOGY_CATEGORIES) {
    const item = category.items.find((i) => i.id === id);
    if (item) return { item, category };
  }
  return null;
}

/** Por nombre visible, sin tildes ni mayúsculas: el móvil solo envía el nombre. */
export function findNosologyByName(name?: string | null): NosologyMatch | null {
  const key = name?.trim() ? normalizeLabelKey(name) : "";
  if (!key) return null;
  for (const category of NOSOLOGY_CATEGORIES) {
    const item = category.items.find((i) => normalizeLabelKey(i.name) === key);
    if (item) return { item, category };
  }
  return null;
}

/** Filtro del buscador: un grupo sale si coincide su nombre (con todas sus
 * condiciones) o alguna de sus condiciones (solo esas). */
export function filterNosologyCategories(
  query: string,
): NosologyCategory[] {
  const q = query.trim() ? normalizeLabelKey(query) : "";
  if (!q) return [...NOSOLOGY_CATEGORIES];
  const out: NosologyCategory[] = [];
  for (const category of NOSOLOGY_CATEGORIES) {
    if (normalizeLabelKey(category.name).includes(q)) {
      out.push(category);
      continue;
    }
    const items = category.items.filter((i) =>
      normalizeLabelKey(i.name).includes(q),
    );
    if (items.length) out.push({ ...category, items });
  }
  return out;
}
