import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { PrismaService } from '../prisma/prisma.service';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const REMOVE_SELECTORS =
  'header, footer, nav, #breadcrumbs, #myDiv, .gtranslate-container';

/**
 * Scraper del atlas dermatológico (INTEGRACIONES-IA.md §1.4). Skiniver
 * entrega URLs en ruso (`skinive.ru/...` o `skinive.com/ru/...`); se
 * reescriben a `/es/` antes de cachear.
 */
@Injectable()
export class EncyclopediaService {
  private readonly logger = new Logger(EncyclopediaService.name);

  constructor(private readonly prisma: PrismaService) {}

  toSpanishUrl(url: string): string {
    return url
      .replace('skinive.ru/', 'skinive.com/es/')
      .replace('skinive.com/ru/', 'skinive.com/es/');
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
    const finalUrl = response.url || url;
    const html = await response.text();

    const $ = cheerio.load(html);
    $(REMOVE_SELECTORS).remove();
    const title =
      $('h1').first().text().trim() || $('title').first().text().trim();
    const content = $.html();

    return this.prisma.encyclopediaEntry.upsert({
      where: { url: finalUrl },
      update: { title, content, originalUrl: rawUrl },
      create: { url: finalUrl, originalUrl: rawUrl, title, content },
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
