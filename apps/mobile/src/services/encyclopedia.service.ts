import { apiRequest } from './api.client';

export type EncyclopediaEntry = {
  id: string;
  url: string;
  title: string | null;
  content: string | null;
};

export const encyclopediaService = {
  getByUrl(url: string) {
    return apiRequest<EncyclopediaEntry | null>(
      `/encyclopedia/by-url?url=${encodeURIComponent(url)}`,
      { auth: true },
    );
  },
};

/** Quita etiquetas HTML básicas para mostrar el artículo en móvil. */
export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
