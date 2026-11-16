import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { uploadAvatarThumb } from './avatar-thumb';

/**
 * Las fotos de perfil subidas antes de `avatar_thumb_key` no tienen
 * miniatura, y las listas mostrarían las iniciales. Al arrancar se generan,
 * una por una y en segundo plano: no retrasa el arranque ni carga varias
 * fotos de varios MB en memoria a la vez.
 *
 * Idempotente: la fila con miniatura ya no vuelve a entrar. Una que falle
 * (archivo borrado del bucket) se reintenta en el siguiente arranque.
 */
@Injectable()
export class AvatarThumbBackfill implements OnApplicationBootstrap {
  private readonly logger = new Logger(AvatarThumbBackfill.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  onApplicationBootstrap(): void {
    void this.rellenar().catch((error) =>
      this.logger.error('Relleno de miniaturas de foto falló', error),
    );
  }

  private async rellenar() {
    const pending = await this.prisma.user.findMany({
      where: { avatarKey: { not: null }, avatarThumbKey: null },
      select: { id: true, avatarKey: true },
    });
    if (pending.length === 0) return;

    let done = 0;
    for (const user of pending) {
      const key = user.avatarKey!;
      try {
        const thumbKey = await uploadAvatarThumb(
          this.storage,
          key,
          await this.storage.read(key),
        );
        await this.prisma.user.update({
          where: { id: user.id },
          data: { avatarThumbKey: thumbKey },
        });
        done++;
      } catch (err) {
        this.logger.warn(
          `Sin miniatura para ${key}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    this.logger.log(
      `Miniaturas de foto: ${done} generadas, ${pending.length - done} con error`,
    );
  }
}
