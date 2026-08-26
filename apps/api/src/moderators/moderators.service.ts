import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateModeratorDto } from './dto/create-moderator.dto';

@Injectable()
export class ModeratorsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.moderator.findMany({
      include: { user: { select: { email: true, createdAt: true } } },
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: string) {
    const moderator = await this.prisma.moderator.findUnique({
      where: { id: BigInt(id) },
      include: { user: { select: { email: true, createdAt: true } } },
    });
    if (!moderator) throw new NotFoundException('Moderador no encontrado');
    return moderator;
  }

  async create(dto: CreateModeratorDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con ese email');
    }

    const password = await argon2.hash(dto.password);
    const phone = dto.phone?.trim() || null;

    const user = await this.prisma.user.create({
      data: {
        email,
        password,
        name: `${dto.firstName} ${dto.lastName}`.trim(),
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phone,
        roles: { connect: { name: 'monitor' } },
        moderator: {
          create: {
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            docType: dto.docType?.trim() || null,
            docNumber: dto.docNumber?.trim() || null,
            phone,
          },
        },
      },
    });

    return this.prisma.moderator.findUniqueOrThrow({
      where: { userId: user.id },
      include: { user: { select: { email: true, createdAt: true } } },
    });
  }

  async remove(id: string) {
    const moderator = await this.findOne(id);
    await this.prisma.user.delete({ where: { id: moderator.userId } });
    return { ok: true };
  }
}
