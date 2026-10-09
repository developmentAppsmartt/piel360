import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DEFAULT_ACCOUNT_BRANDING,
  DEFAULT_BRANDING_COLORS,
  isAllowedBrandingColor,
  type AccountBranding,
  type BrandingColorKey,
} from '@piel360/shared';
import type { AccountBranding as AccountBrandingRow } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuthService } from '../auth/auth.service';
import type { JwtPayload } from '../auth/types';
import type { UpdateBrandingDto } from './dto/update-branding.dto';

export const PERSONALIZATION_PERMISSION = 'clinical.settings.personalization';

const IMAGE_MIME = new Map([
  ['image/jpeg', 'jpg'],
  ['image/jpg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

/** El login móvil cachea la URL; la renueva al abrir la app. */
const IMAGE_URL_TTL_SECONDS = 7 * 24 * 60 * 60;

const COLOR_COLUMNS: Record<
  BrandingColorKey,
  keyof Pick<
    AccountBrandingRow,
    | 'backgroundColor'
    | 'primaryColor'
    | 'primaryTextColor'
    | 'secondaryTextColor'
    | 'iconColor'
    | 'secondaryColor'
    | 'buttonColor'
    | 'buttonHoverColor'
    | 'gradientStartColor'
    | 'gradientEndColor'
    | 'gradientHoverStartColor'
    | 'gradientHoverEndColor'
    | 'buttonTextColor'
    | 'gradientTextColor'
    | 'linkColor'
    | 'loginTextColor'
  >
> = {
  background: 'backgroundColor',
  primary: 'primaryColor',
  primaryText: 'primaryTextColor',
  secondaryText: 'secondaryTextColor',
  icon: 'iconColor',
  secondary: 'secondaryColor',
  button: 'buttonColor',
  buttonHover: 'buttonHoverColor',
  gradientStart: 'gradientStartColor',
  gradientEnd: 'gradientEndColor',
  gradientHoverStart: 'gradientHoverStartColor',
  gradientHoverEnd: 'gradientHoverEndColor',
  buttonText: 'buttonTextColor',
  gradientText: 'gradientTextColor',
  link: 'linkColor',
  loginText: 'loginTextColor',
};

export type BrandingImageKind = 'login-background' | 'login-logo';

@Injectable()
export class BrandingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly auth: AuthService,
  ) {}

  /**
   * Solo el dueño de la cuenta con el módulo Personalización activo. Se lee
   * de BD: el JWT puede ser anterior a que se asignara el módulo al rol.
   */
  async assertCanManage(user: JwtPayload) {
    const userId = BigInt(user.sub);
    const [membership, permissions] = await Promise.all([
      this.prisma.organizationMember.findFirst({
        where: { userId, memberRole: 'member' },
        select: { id: true },
      }),
      this.auth.getPermissionsForUser(user.sub),
    ]);
    if (membership) {
      throw new ForbiddenException(
        'Solo el dueño de la cuenta puede cambiar la personalización',
      );
    }
    if (!permissions.includes(PERSONALIZATION_PERMISSION)) {
      throw new ForbiddenException(
        'Tu plan no incluye el módulo de personalización',
      );
    }
  }

  async getOwn(user: JwtPayload): Promise<AccountBranding> {
    await this.assertCanManage(user);
    const row = await this.prisma.accountBranding.findUnique({
      where: { userId: BigInt(user.sub) },
    });
    return this.toDto(row);
  }

  async update(
    user: JwtPayload,
    dto: UpdateBrandingDto,
  ): Promise<AccountBranding> {
    await this.assertCanManage(user);
    const data: Partial<Record<string, string | boolean | null>> = {};
    if (dto.loginOverlay !== undefined) data.loginOverlay = dto.loginOverlay;
    for (const [key, column] of Object.entries(COLOR_COLUMNS) as [
      BrandingColorKey,
      string,
    ][]) {
      const value = dto.colors?.[key];
      if (value === undefined) continue;
      if (value === null) {
        data[column] = null;
        continue;
      }
      if (!isAllowedBrandingColor(value, key)) {
        throw new BadRequestException(`Color no permitido: ${value}`);
      }
      data[column] = value.toUpperCase();
    }
    const userId = BigInt(user.sub);
    const row = await this.prisma.accountBranding.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    return this.toDto(row);
  }

  async uploadImage(
    user: JwtPayload,
    kind: BrandingImageKind,
    file: Express.Multer.File | undefined,
  ): Promise<AccountBranding> {
    await this.assertCanManage(user);
    if (!file?.buffer?.length) {
      throw new BadRequestException('No se recibió la imagen (campo "file")');
    }
    const mime = (file.mimetype || '').toLowerCase();
    const ext = IMAGE_MIME.get(mime);
    if (!ext) {
      throw new BadRequestException(
        'Formato no permitido. Usa JPG, PNG o WebP.',
      );
    }
    const userId = BigInt(user.sub);
    const key = `branding/${user.sub}/${kind}-${Date.now()}.${ext}`;
    try {
      await this.storage.upload(
        key,
        file.buffer,
        mime === 'image/jpg' ? 'image/jpeg' : mime,
      );
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new BadGatewayException(`No se pudo guardar la imagen (${detail})`);
    }

    const column =
      kind === 'login-background' ? 'loginBackgroundKey' : 'loginLogoKey';
    const previous = await this.prisma.accountBranding.findUnique({
      where: { userId },
    });
    const row = await this.prisma.accountBranding.upsert({
      where: { userId },
      create: { userId, [column]: key },
      update: { [column]: key },
    });
    const oldKey = previous?.[column];
    if (oldKey && oldKey !== key) await this.storage.delete(oldKey);
    return this.toDto(row);
  }

  async removeImage(
    user: JwtPayload,
    kind: BrandingImageKind,
  ): Promise<AccountBranding> {
    await this.assertCanManage(user);
    const userId = BigInt(user.sub);
    const existing = await this.prisma.accountBranding.findUnique({
      where: { userId },
    });
    if (!existing) return this.toDto(null);
    const column =
      kind === 'login-background' ? 'loginBackgroundKey' : 'loginLogoKey';
    const oldKey = existing[column];
    const row = await this.prisma.accountBranding.update({
      where: { userId },
      data: { [column]: null },
    });
    if (oldKey) await this.storage.delete(oldKey);
    return this.toDto(row);
  }

  /**
   * Branding que ve un usuario en mobile: el suyo si es dueño; el del dueño
   * de la empresa si es miembro; el de su profesional (o la empresa de este)
   * si es paciente.
   */
  async getEffective(userId: string): Promise<AccountBranding> {
    const ownerId = await this.resolveOwnerUserId(BigInt(userId));
    if (!ownerId) return DEFAULT_ACCOUNT_BRANDING;
    const row = await this.prisma.accountBranding.findUnique({
      where: { userId: ownerId },
    });
    return this.toDto(row);
  }

  async getPublic(publicId: string): Promise<AccountBranding> {
    const row = await this.prisma.accountBranding
      .findUnique({ where: { publicId } })
      .catch(() => null);
    if (!row) throw new NotFoundException('Personalización no encontrada');
    return this.toDto(row);
  }

  async resolveOwnerUserId(userId: bigint): Promise<bigint | null> {
    const patient = await this.prisma.patient.findUnique({
      where: { userId },
      select: { doctor: { select: { userId: true } } },
    });
    const accountUserId = patient ? (patient.doctor?.userId ?? null) : userId;
    if (!accountUserId) return null;

    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId: accountUserId, memberRole: 'member' },
      select: { organization: { select: { ownerUserId: true } } },
    });
    return membership?.organization.ownerUserId ?? accountUserId;
  }

  private async toDto(
    row: AccountBrandingRow | null,
  ): Promise<AccountBranding> {
    if (!row) return DEFAULT_ACCOUNT_BRANDING;
    return {
      publicId: row.publicId,
      colors: {
        background:
          row.backgroundColor ?? DEFAULT_BRANDING_COLORS.background,
        primary: row.primaryColor ?? DEFAULT_BRANDING_COLORS.primary,
        primaryText:
          row.primaryTextColor ?? DEFAULT_BRANDING_COLORS.primaryText,
        secondaryText:
          row.secondaryTextColor ?? DEFAULT_BRANDING_COLORS.secondaryText,
        icon: row.iconColor ?? DEFAULT_BRANDING_COLORS.icon,
        secondary: row.secondaryColor ?? DEFAULT_BRANDING_COLORS.secondary,
        button: row.buttonColor ?? DEFAULT_BRANDING_COLORS.button,
        buttonHover:
          row.buttonHoverColor ?? DEFAULT_BRANDING_COLORS.buttonHover,
        gradientStart:
          row.gradientStartColor ?? DEFAULT_BRANDING_COLORS.gradientStart,
        gradientEnd:
          row.gradientEndColor ?? DEFAULT_BRANDING_COLORS.gradientEnd,
        gradientHoverStart:
          row.gradientHoverStartColor ??
          DEFAULT_BRANDING_COLORS.gradientHoverStart,
        gradientHoverEnd:
          row.gradientHoverEndColor ?? DEFAULT_BRANDING_COLORS.gradientHoverEnd,
        buttonText: row.buttonTextColor ?? DEFAULT_BRANDING_COLORS.buttonText,
        gradientText:
          row.gradientTextColor ?? DEFAULT_BRANDING_COLORS.gradientText,
        link: row.linkColor ?? DEFAULT_BRANDING_COLORS.link,
        loginText: row.loginTextColor ?? DEFAULT_BRANDING_COLORS.loginText,
      },
      loginBackgroundUrl: await this.signOrNull(row.loginBackgroundKey),
      loginLogoUrl: await this.signOrNull(row.loginLogoKey),
      loginOverlay: row.loginOverlay,
    };
  }

  private async signOrNull(key: string | null): Promise<string | null> {
    if (!key) return null;
    try {
      return await this.storage.getSignedUrl(key, IMAGE_URL_TTL_SECONDS);
    } catch {
      return null;
    }
  }
}
