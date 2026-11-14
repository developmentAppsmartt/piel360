import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PROFILE_PHOTO_TYPE_ERROR } from '@piel360/shared';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import type { UpdateMeDto } from './dto/update-me.dto';
import type { UpdateUserAdminDto } from './dto/update-user-admin.dto';

function omitPassword<T extends { password: string }>(user: T) {
  const { password: _password, ...rest } = user;
  void _password;
  return rest;
}

/** Tipo real por la firma del archivo, no por el mimetype: la app móvil puede
 * mandar `application/octet-stream` y el nombre no garantiza nada. */
function photoTypeFromBytes(
  buffer: Buffer,
): { ext: 'png' | 'jpg'; mime: string } | null {
  if (buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) {
    return { ext: 'png', mime: 'image/png' };
  }
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }
  return null;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: {
        roles: true,
        doctor: {
          select: {
            empresa: true,
            empresaReferida: true,
            membershipType: true,
            specialty: true,
          },
        },
        patient: { select: { id: true } },
      },
      orderBy: { id: 'asc' },
    });
    return Promise.all(
      users.map(async (u) => {
        const base = omitPassword(u);
        const withAvatar = await this.withAvatarUrl(base);
        const { doctor, patient, ...rest } = withAvatar;
        return {
          ...rest,
          doctor: doctor ?? null,
          patient: patient ? { id: patient.id.toString() } : null,
        };
      }),
    );
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(id) },
      include: { roles: true, doctor: true, patient: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return this.withAvatarUrl(omitPassword(user));
  }

  async update(id: string, dto: UpdateUserAdminDto) {
    await this.findOne(id);
    const user = await this.prisma.user.update({
      where: { id: BigInt(id) },
      data: dto,
      include: { roles: true },
    });
    return this.withAvatarUrl(omitPassword(user));
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    const user = await this.prisma.user.update({
      where: { id: BigInt(userId) },
      data: dto,
    });
    return this.withAvatarUrl(omitPassword(user));
  }

  async uploadAvatar(userId: string, file: Express.Multer.File | undefined) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('No se recibió la imagen (campo "avatar")');
    }
    const type = photoTypeFromBytes(file.buffer);
    if (!type) throw new BadRequestException(PROFILE_PHOTO_TYPE_ERROR);
    const key = `users/${userId}/avatar.${type.ext}`;
    const previousKey = await this.avatarKeyOf(userId);
    try {
      await this.storage.upload(key, file.buffer, type.mime);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new BadGatewayException(
        `No se pudo guardar la foto de perfil (${detail}). Revisa S3 o usa STORAGE_DRIVER=local.`,
      );
    }

    const user = await this.prisma.user.update({
      where: { id: BigInt(userId) },
      data: { avatarKey: key },
    });
    // De PNG a JPG (o al revés) la key cambia y la foto vieja quedaría huérfana.
    if (previousKey && previousKey !== key) await this.deleteFile(previousKey);
    const avatarUrl = await this.signAvatar(key);
    return {
      ...omitPassword(user),
      avatarUrl,
    };
  }

  /** Idempotente: sin foto también responde bien. */
  async removeAvatar(userId: string) {
    const key = await this.avatarKeyOf(userId);
    if (key) {
      await this.prisma.user.update({
        where: { id: BigInt(userId) },
        data: { avatarKey: null },
      });
      await this.deleteFile(key);
    }
    return { avatarUrl: null };
  }

  async getAvatarUrlForUserId(userId: string | bigint | null | undefined) {
    if (userId == null) return null;
    return this.signAvatar(await this.avatarKeyOf(userId));
  }

  private async avatarKeyOf(userId: string | bigint) {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: { avatarKey: true },
    });
    return user?.avatarKey ?? null;
  }

  /** Un archivo que no se pudo borrar no debe tumbar el cambio de foto. */
  private async deleteFile(key: string) {
    try {
      await this.storage.delete(key);
    } catch (err) {
      this.logger.warn(
        `No se pudo borrar la foto ${key}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private async signAvatar(key: string | null | undefined) {
    if (!key) return null;
    try {
      return await this.storage.getSignedUrl(key);
    } catch {
      return null;
    }
  }

  private async withAvatarUrl<T extends { avatarKey?: string | null }>(
    user: T,
  ) {
    const avatarUrl = await this.signAvatar(user.avatarKey);
    return { ...user, avatarUrl };
  }
}
