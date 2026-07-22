import type { NosologyCategory, NosologyItem } from '../types/nosology';
import { NOSOLOGY_CATEGORIES } from '../views/nosologies/data/nosologies';

/**
 * Hoy: catálogo estático del diseño.
 * Después: GET /encyclopedia o endpoint de nosologías.
 */
export const nosologiesService = {
  async listCategories(): Promise<NosologyCategory[]> {
    await Promise.resolve();
    return NOSOLOGY_CATEGORIES;
  },

  async getCategory(id: string): Promise<NosologyCategory | null> {
    await Promise.resolve();
    return NOSOLOGY_CATEGORIES.find((c) => c.id === id) ?? null;
  },

  filterCategories(all: NosologyCategory[], query: string): NosologyCategory[] {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all
      .map((cat) => {
        const nameMatch = cat.name.toLowerCase().includes(q);
        const items = cat.items.filter((i) => i.name.toLowerCase().includes(q));
        if (nameMatch) return cat;
        if (items.length) return { ...cat, items };
        return null;
      })
      .filter((c): c is NosologyCategory => Boolean(c));
  },

  filterItems(items: NosologyItem[], query: string): NosologyItem[] {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q));
  },
};
