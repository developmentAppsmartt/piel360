import { Injectable, Logger } from '@nestjs/common';
import { LEGAL_VERSION, type Role } from '@piel360/shared';
import { PrismaService } from '../prisma/prisma.service';

/** Los administradores de la plataforma no aceptan términos (lo pidió el cliente). */
const LEGAL_EXEMPT_ROLES: readonly Role[] = ['superadmin', 'monitor'];

/**
 * Aceptación de términos y política de datos, y consentimiento previo al
 * análisis. Vive aparte de AuthService/AnalysesService a propósito: los
 * controladores lo llaman después de registrar o de crear el análisis.
 */
@Injectable()
export class LegalService {
  private readonly logger = new Logger(LegalService.name);

  constructor(private readonly prisma: PrismaService) {}

  async accept(userId: bigint): Promise<void> {
    const now = new Date();
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        termsAcceptedAt: now,
        privacyAcceptedAt: now,
        legalVersion: LEGAL_VERSION,
      },
    });
  }

  /** Tras el registro: los endpoints no siempre devuelven el id del usuario. */
  async acceptByEmail(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true },
    });
    if (!user) {
      this.logger.warn(
        `Registro sin usuario para guardar la aceptación (${email})`,
      );
      return;
    }
    await this.accept(user.id);
  }

  /** `true` si aceptó la versión vigente o si es administrador. */
  async termsAccepted(userId: bigint, role: Role): Promise<boolean> {
    if (LEGAL_EXEMPT_ROLES.includes(role)) return true;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        termsAcceptedAt: true,
        privacyAcceptedAt: true,
        legalVersion: true,
      },
    });
    return Boolean(
      user?.termsAcceptedAt &&
      user.privacyAcceptedAt &&
      user.legalVersion === LEGAL_VERSION,
    );
  }

  async recordAnalysisConsent(analysisId: bigint | string): Promise<void> {
    await this.prisma.analysis.update({
      where: { id: BigInt(analysisId) },
      data: { consentAcceptedAt: new Date() },
    });
  }
}
