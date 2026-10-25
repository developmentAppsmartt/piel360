const COMBINING_DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

/** Minúsculas y sin tildes, para que «serum» encuentre «Sérum». */
export function normalizeText(text: string): string {
  return text.normalize("NFD").replace(COMBINING_DIACRITICS, "").toLowerCase();
}
