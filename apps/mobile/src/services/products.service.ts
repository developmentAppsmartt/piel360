import { apiRequest } from './api.client';

export type ProductCategory = {
  id: string;
  doctorId: string;
  categoryName: string;
  createdAt: string;
  lastModified: string;
  _count?: { products: number };
};

export type CatalogProduct = {
  id: string;
  doctorId: string;
  categoryId: string;
  productName: string;
  productDescription: string | null;
  productUrl: string | null;
  imageUrl: string | null;
  enablePrice: boolean;
  pricingType: 'fixed' | 'variable' | null;
  currencyCode: string;
  originalPrice: string | null;
  sellingPrice: string | null;
  createdAt: string;
  updatedAt: string;
  category: { id: string; categoryName: string };
};

export const CATALOG_TABS = [
  { key: 'rutinas', label: 'Rutinas', match: ['rutina'] },
  { key: 'productos', label: 'Productos', match: ['producto'] },
  { key: 'suplementos', label: 'Suplementos', match: ['suplement'] },
  { key: 'tratamientos', label: 'Tratamientos', match: ['tratamient'] },
] as const;

export type CatalogTabKey = (typeof CATALOG_TABS)[number]['key'];

export function matchCatalogTab(
  categoryName: string,
  tab: CatalogTabKey,
): boolean {
  const n = categoryName.toLowerCase();
  const def = CATALOG_TABS.find((t) => t.key === tab);
  if (!def) return false;
  return def.match.some((m) => n.includes(m));
}

export const productsService = {
  async listCategories(): Promise<ProductCategory[]> {
    return apiRequest<ProductCategory[]>('/products/categories', {
      auth: true,
    });
  },

  async list(categoryId?: string): Promise<CatalogProduct[]> {
    const q = categoryId
      ? `?categoryId=${encodeURIComponent(categoryId)}`
      : '';
    return apiRequest<CatalogProduct[]>(`/products${q}`, { auth: true });
  },
};
