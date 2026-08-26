import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import type { UpdateMeDto } from './dto/update-me.dto';
import type { UpdateUserAdminDto } from './dto/update-user-admin.dto';

const AVATAR_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/octet-stream',
]);

function omitPassword<T extends { password: string }>(user: T) {
  const { password: _password, ...rest } = user;
  void _password;
  return rest;
}

function guessExt(mimetype: string, originalname?: string): string {
  const fromName = originalname?.toLowerCase().match(/\.(jpe?g|png|webp)$/)?.[1];
  if (fromName === 'jpeg' || fromName === 'jpg') return 'jpg';
  if (fromName === 'png' || fromName === 'webp') return fromName;
  if (mimetype === 'image/png') return 'png';
  if (mimetype === 'image/webp') return 'webp';
  return 'jpg';
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: { roles: true },
      orderBy: { id: 'asc' },
    });
    return Promise.all(users.map((u) => this.withAvatarUrl(omitPassword(u))));
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
    const mime = (file.mimetype || '').toLowerCase();
    if (mime && !AVATAR_MIME.has(mime)) {
      throw new BadRequestException(
        'Formato no permitido. Usa JPG, PNG o WebP.',
      );
    }
    const ext = guessExt(mime, file.originalname);
    const key = `users/${userId}/avatar.${ext}`;
    try {
      await this.storage.upload(
        key,
        file.buffer,
        mime && mime !== 'application/octet-stream'
          ? mime
          : ext === 'png'
            ? 'image/png'
            : ext === 'webp'
              ? 'image/webp'
              : 'image/jpeg',
      );
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
    const avatarUrl = await this.signAvatar(key);
    return {
      ...omitPassword(user),
      avatarUrl,
    };
  }

  async getAvatarUrlForUserId(userId: string | bigint | null | undefined) {
    if (userId == null) return null;
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: { avatarKey: true },
    });
    return this.signAvatar(user?.avatarKey);
  }

  private async signAvatar(key: string | null | undefined) {
    if (!key) return null;
    try {
      return await this.storage.getSignedUrl(key);
    } catch {
      return null;
    }
  }

  private async withAvatarUrl<T extends { avatarKey?: string | null }>(user: T) {
    const avatarUrl = await this.signAvatar(user.avatarKey);
    return { ...user, avatarUrl };
  }
}
