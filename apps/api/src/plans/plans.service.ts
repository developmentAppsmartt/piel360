import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  /** `GET /plans` — catálogo para el selector de planes (checkout Wompi). */
  findAll() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      include: { provider: true },
      orderBy: { price: 'asc' },
    });
  }
}
