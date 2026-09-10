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

    const response = await fetch(url, { redirect: 'follow' });
    if (!response.ok) {
      this.logger.warn(`No se pudo scrapear ${url}: ${response.status}`);
      throw new Error(`Fetch de enciclopedia falló: ${response.status}`);
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
    const content = $.html();

    // Se guarda bajo `url` (la misma clave con la que se cachea arriba y con
    // la que `findByUrl` va a preguntar) — NO bajo `response.url` (post-
    // redirect). skinive.com hace 301 cuando el link no termina en "/" (el
    // atlas_page_link real de Skiniver no siempre la trae); guardar bajo la
    // URL final rompía el caché: quedaba huérfano, invisible para
    // `findByUrl`, y el doctor nunca veía el artículo aunque el scrape
    // hubiera funcionado.
    return this.prisma.encyclopediaEntry.upsert({
      where: { url },
      update: { title, content, originalUrl: rawUrl },
      create: { url, originalUrl: rawUrl, title, content },
    });
  }

  findAll() {
    return this.prisma.encyclopediaEntry.findMany({ orderBy: { id: 'asc' } });
  }

  /** null si aún no se ha scrapeado (el job de la cola puede no haber
   * corrido todavía) — el caller decide cómo mostrar ese estado. */
  findByUrl(url: string) {
    return this.prisma.encyclopediaEntry.findUnique({
      where: { url: this.toSpanishUrl(url) },
    });
  }

  async findOne(id: string) {
    const entry = await this.prisma.encyclopediaEntry.findUnique({
      where: { id: BigInt(id) },
    });
    if (!entry) throw new NotFoundException('Artículo no encontrado');
    return entry;
  }
}
