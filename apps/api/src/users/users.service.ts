import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateMeDto } from './dto/update-me.dto';
import type { UpdateUserAdminDto } from './dto/update-user-admin.dto';

function omitPassword<T extends { password: string }>(user: T) {
  const { password: _password, ...rest } = user;
  void _password;
  return rest;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: { roles: true },
      orderBy: { id: 'asc' },
    });
    return users.map(omitPassword);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(id) },
      include: { roles: true, doctor: true, patient: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return omitPassword(user);
  }

  async update(id: string, dto: UpdateUserAdminDto) {
    await this.findOne(id);
    const user = await this.prisma.user.update({
      where: { id: BigInt(id) },
      data: dto,
      include: { roles: true },
    });
    return omitPassword(user);
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    const user = await this.prisma.user.update({
      where: { id: BigInt(userId) },
      data: dto,
    });
    return omitPassword(user);
  }
}
