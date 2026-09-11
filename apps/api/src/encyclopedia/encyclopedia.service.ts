import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { PrismaService } from '../prisma/prisma.service';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const REMOVE_SELECTORS =
  // #cmplz-cookiebanner-container: widget de cookies (plugin "Complianz" de
  // WordPress) — trae texto sin traducir/sin renderizar (placeholders tipo
  // {title}/{vendor_count} que Complianz llena con JS del lado del cliente,
  // nunca ejecutado acá porque scrapeamos HTML estático).
  'header, footer, nav, #breadcrumbs, #myDiv, .gtranslate-container, #cmplz-cookiebanner-container, #cmplz-manage-consent';

/**
 * Scraper del atlas dermatológico (INTEGRACIONES-IA.md §1.4). El
 * `atlas_page_link` real que manda Skiniver en producción no trae ningún
 * prefijo de idioma (ej. `skinive.com/dermatlas/...`, que por defecto sirve
 * inglés) — se reescribe a `/es/` antes de cachear. El parámetro `locale`
 * de la API de Skiniver (`get_atlas_pages`/`get_atlas_preview`) se probó
 * contra la API real y no tiene ningún efecto (siempre devuelve ruso), así
 * que no sirve para esto — el sitio web público de Skiniver sí tiene
 * contenido real en español (WordPress + Polylang) bajo `/es/`.
 */
@Injectable()
export class EncyclopediaService {
  private readonly logger = new Logger(EncyclopediaService.name);

  constructor(private readonly prisma: PrismaService) {}

  toSpanishUrl(url: string): string {
    try {
      const u = new URL(url);
      u.hostname = 'skinive.com';
      u.pathname = u.pathname.replace(/^\/(ru|en)(?=\/)/, '');
      if (!u.pathname.startsWith('/es/')) {
        u.pathname = `/es${u.pathname}`;
      }
      return u.toString();
    } catch {
      return url;
    }
  }

  async processUrl(rawUrl: string) {
    const url = this.toSpanishUrl(rawUrl);

    const cached = await this.prisma.encyclopediaEntry.findUnique({
      where: { url },
    });
    if (cached && Date.now() - cached.updatedAt.getTime() < CACHE_TTL_MS) {
      return cached;
    }

    let article = await this.fetchArticle(url);
    if (!article) {
      // Skinive reorganiza de vez en cuando las categorías del atlas (ej.
      // "precancer/id5-lentigo" pasó a "benign-formations/id5-lentigo").
      // skinive.com mantiene el redirect 301 categoría-vieja → nueva del
      // lado por defecto/inglés, pero NO del lado /es/ (Polylang) — ahí cae
      // a un catch-all que devuelve la landing de "descarga la app"
      // (fetchArticle ya lo descartó arriba). Reintentamos resolviendo la
      // ruta canónica por el lado que sí redirige bien, y volviendo a
      // pedir esa ruta en español.
      const canonicalUrl = await this.resolveCanonicalUrl(rawUrl);
      const retryUrl = canonicalUrl && this.toSpanishUrl(canonicalUrl);
      if (retryUrl && retryUrl !== url) {
        article = await this.fetchArticle(retryUrl);
      }
    }

    if (!article) {
      // No es un error transitorio: o Skinive dio de baja el artículo, o no
      // hay forma de resolver la categoría nueva. No hacemos upsert —
      // `findByUrl` sigue sin encontrar nada y el frontend ya muestra
      // "Artículo aún no disponible" en ese caso, en vez de guardar la
      // landing de marketing como si fuera contenido real.
      this.logger.warn(`Artículo removido del atlas de Skinive: ${rawUrl}`);
      throw new Error('El artículo ya no existe en el atlas de Skinive');
    }

    // Se guarda bajo `url` (la misma clave con la que se cachea arriba y con
    // la que `findByUrl` va a preguntar) — NO bajo la URL canónica/resuelta.
    // skinive.com hace 301 cuando el link no termina en "/" (el
    // atlas_page_link real de Skiniver no siempre la trae) o cuando cambia
    // de categoría; guardar bajo la URL final rompía el caché: quedaba
    // huérfano, invisible para `findByUrl` (que siempre recalcula la key a
    // partir del atlas_page_link original, que Skiniver nunca actualiza), y
    // el doctor nunca veía el artículo aunque el scrape hubiera funcionado.
    const { title, content } = article;
    return this.prisma.encyclopediaEntry.upsert({
      where: { url },
      update: { title, content, originalUrl: rawUrl },
      create: { url, originalUrl: rawUrl, title, content },
    });
  }

  /** Descarga `url` y devuelve título+HTML limpio, o `null` si la respuesta
   * no es realmente un artículo del atlas (ej. terminó en `/get-skinive/`,
   * la landing de "descarga la app" a la que Skinive cae cuando no puede
   * resolver la ruta pedida). Nunca lanza por esto — un `null` es una señal
   * normal para que el caller decida si reintentar por otra ruta. */
  private async fetchArticle(
    url: string,
  ): Promise<{ title: string; content: string } | null> {
    const response = await fetch(url, { redirect: 'follow' });
    if (!response.ok) {
      this.logger.warn(`No se pudo scrapear ${url}: ${response.status}`);
      return null;
    }
    // Todo artículo real del atlas vive bajo /dermatlas/...; la landing de
    // descarga y cualquier otro catch-all no.
    if (!new URL(response.url).pathname.includes('/dermatlas/')) {
      this.logger.warn(`${url} redirigió fuera del atlas: ${response.url}`);
      return null;
    }
    const html = await response.text();

    const $ = cheerio.load(html);
    $(REMOVE_SELECTORS).remove();
    // WordPress hace lazy-load: el <img> real trae un SVG vacío en `src` y
    // la URL real en `data-lazy-src` — sin JS (nunca se ejecuta acá) el
    // navegador se queda con el placeholder vacío para siempre. Se
    // resuelve al scrapear, una sola vez, en vez de en cada render.
    $('img[data-lazy-src]').each((_, el) => {
      const real = $(el).attr('data-lazy-src');
      if (real) $(el).attr('src', real);
    });
    const title =
      $('h1').first().text().trim() || $('title').first().text().trim();
    return { title, content: $.html() };
  }

  /** Sigue los redirects de la URL ORIGINAL (bare, sin `/es/`) para
   * descubrir la ruta canónica actual del artículo — Skinive mantiene esos
   * redirects al reorganizar categorías, a diferencia del lado /es/. Null si
   * tampoco resuelve a un artículo real (el artículo ya no existe). */
  private async resolveCanonicalUrl(rawUrl: string): Promise<string | null> {
    const response = await fetch(rawUrl, { redirect: 'follow' });
    if (!response.ok) return null;
    if (!new URL(response.url).pathname.includes('/dermatlas/')) return null;
    return response.url;
  }

  findAll() {
    return this.prisma.encyclopediaEntry.findMany({ orderBy: { id: 'asc' } });
  }

  /** null si aún no se ha scrapeado (el job de la cola puede no haber
   * corrido todavía) — el caller decide cómo mostrar ese estado.
   * Busca por la URL en español y por `originalUrl` (la que manda Skiniver). */
  async findByUrl(url: string) {
    const trimmed = url.trim();
    if (!trimmed) return null;
    const spanish = this.toSpanishUrl(trimmed);
    const byUrl = await this.prisma.encyclopediaEntry.findFirst({
      where: {
        OR: [
          { url: spanish },
          { url: trimmed },
          { originalUrl: trimmed },
          { originalUrl: spanish },
        ],
      },
    });
    return byUrl;
  }

  async findOne(id: string) {
    const entry = await this.prisma.encyclopediaEntry.findUnique({
      where: { id: BigInt(id) },
    });
    if (!entry) throw new NotFoundException('Artículo no encontrado');
    return entry;
  }
}
