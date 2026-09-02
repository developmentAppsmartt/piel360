import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createReadStream, existsSync } from 'fs';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { dirname, join, normalize, resolve } from 'path';

const SIGNED_URL_TTL_SECONDS = 3600;
/** SigV4 no permite presigned URLs de más de 7 días con credenciales IAM. */
const MAX_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;

/**
 * Reemplaza `Storage::disk('public')` de Laravel (MIGRACION.md §2.1) — Railway
 * no persiste disco, así que las imágenes de análisis van a S3/R2 con keys
 * `analyses/{analysisId}/{tipo}.{ext}` y se sirven vía URL firmada.
 *
 * En local, si S3 no resuelve o `STORAGE_DRIVER=local`, se guarda en
 * `apps/api/storage/` y se sirve por `/api/storage/files/*`.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly forceLocal: boolean;
  private readonly localRoot: string;
  private readonly publicApiUrl: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.getOrThrow<string>('S3_BUCKET');
    this.forceLocal =
      (this.config.get<string>('STORAGE_DRIVER') ?? '').toLowerCase() ===
      'local';
    this.localRoot = resolve(
      this.config.get<string>('STORAGE_LOCAL_ROOT') ??
        join(process.cwd(), 'storage'),
    );
    const port = this.config.get<string>('PORT') ?? '3000';
    this.publicApiUrl = (
      this.config.get<string>('PUBLIC_API_URL') ?? `http://localhost:${port}`
    ).replace(/\/$/, '');

    if (this.forceLocal) {
      this.client = null;
      this.logger.warn(
        `STORAGE_DRIVER=local — archivos en ${this.localRoot}`,
      );
      return;
    }

    const endpoint = this.config.get<string>('S3_ENDPOINT') || undefined;
    const isAws =
      !endpoint ||
      endpoint.includes('amazonaws.com') ||
      endpoint.includes('amazonaws.com.cn');
    this.client = new S3Client({
      region: this.config.getOrThrow<string>('S3_REGION'),
      endpoint,
      forcePathStyle: !isAws,
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('S3_ACCESS_KEY'),
        secretAccessKey: this.config.getOrThrow<string>('S3_SECRET_KEY'),
      },
    });
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<void> {
    if (this.forceLocal || !this.client) {
      await this.uploadLocal(key, body);
      return;
    }
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
    } catch (err) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code?: string }).code)
          : '';
      // Dev sin red/DNS a S3: no tumbar el flujo de avatar/documentos.
      if (
        code === 'ENOTFOUND' ||
        code === 'EAI_AGAIN' ||
        code === 'NetworkingError' ||
        (err instanceof Error && /ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(err.message))
      ) {
        this.logger.warn(
          `S3 no alcanzable (${code || err}); guardando localmente: ${key}`,
        );
        await this.uploadLocal(key, body);
        return;
      }
      throw err;
    }
  }

  /** Elimina un objeto (local y/o S3). Ignora si no existe. */
  async delete(key: string): Promise<void> {
    if (this.localExists(key)) {
      try {
        await unlink(this.localPath(key));
      } catch (err) {
        this.logger.warn(
          `No se pudo borrar local ${key}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
    if (this.forceLocal || !this.client) return;
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (err) {
      this.logger.warn(
        `No se pudo borrar S3 ${key}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  async getSignedUrl(
    key: string,
    expiresInSeconds = SIGNED_URL_TTL_SECONDS,
  ): Promise<string> {
    const expiresIn = Math.min(
      Math.max(1, expiresInSeconds),
      MAX_SIGNED_URL_TTL_SECONDS,
    );
    // Si el archivo quedó en disco (driver local o fallback por S3 caído), servir local.
    if (this.forceLocal || !this.client) {
      if (!this.localExists(key)) {
        throw new Error(`Archivo local no encontrado: ${key}`);
      }
      return this.localPublicUrl(key);
    }
    if (this.localExists(key)) {
      return this.localPublicUrl(key);
    }
    try {
      const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
      return await getSignedUrl(this.client, command, {
        expiresIn,
      });
    } catch (err) {
      if (this.localExists(key)) {
        return this.localPublicUrl(key);
      }
      throw err;
    }
  }

  /** Stream de un archivo local (solo keys bajo el root). */
  openLocalFile(key: string) {
    const full = this.localPath(key);
    if (!full.startsWith(this.localRoot) || !existsSync(full)) {
      throw new NotFoundException('Archivo no encontrado');
    }
    return createReadStream(full);
  }

  localExists(key: string): boolean {
    try {
      return existsSync(this.localPath(key));
    } catch {
      return false;
    }
  }

  /** Copia una URL temporal de Skiniver/YouCam (expiran) a un Buffer para
   * subirla a nuestro propio bucket. */
  async downloadToBuffer(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`No se pudo descargar ${url}: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private async uploadLocal(key: string, body: Buffer) {
    const full = this.localPath(key);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, body);
  }

  private localPath(key: string): string {
    const safe = normalize(key).replace(/^(\.\.(\/|\\|$))+/, '');
    return join(this.localRoot, safe);
  }

  private localPublicUrl(key: string): string {
    const encoded = key
      .split('/')
      .map((part) => encodeURIComponent(part))
      .join('/');
    return `${this.publicApiUrl}/api/storage/files/${encoded}`;
  }
}
