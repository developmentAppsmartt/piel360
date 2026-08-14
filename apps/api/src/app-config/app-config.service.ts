import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AppConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.appConfig.findMany({ orderBy: { key: 'asc' } });
  }

  async findByKey(key: string) {
    const config = await this.prisma.appConfig.findUnique({ where: { key } });
    if (!config) throw new NotFoundException(`Config key "${key}" not found`);
    return config;
  }

  /** Upsert: crea o actualiza la clave. */
  async upsert(key: string, value: string) {
    return this.prisma.appConfig.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  /** Utilidad para leer el código de moneda con fallback a "COP". */
  async getCurrencyCode(): Promise<string> {
    const config = await this.prisma.appConfig
      .findUnique({ where: { key: 'currency_code' } })
      .catch(() => null);
    return config?.value ?? 'COP';
  }
}
