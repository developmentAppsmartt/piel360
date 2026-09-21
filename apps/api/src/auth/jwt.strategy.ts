import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { SESSION_REPLACED, SESSION_REPLACED_MESSAGE } from '@piel360/shared';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from './types';

/**
 * Acepta el token desde la cookie httpOnly `piel360_token` (web, ver
 * apps/web/src/proxy.ts) o desde `Authorization: Bearer` (móvil, que usa
 * expo-secure-store en vez de cookies — ver MIGRACION.md §5).
 */
function extractFromCookie(req: Request): string | null {
  const cookies = req.cookies as Record<string, string> | undefined;
  return cookies?.piel360_token ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        extractFromCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * Además de la firma, valida que la sesión (`sid`) siga viva: es lo que
   * hace efectivo el límite de sesiones simultáneas — sin esto, el token de
   * la sesión expulsada seguiría sirviendo hasta vencer.
   * Los tokens viejos (sin `sid`) se aceptan hasta que expiren.
   */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload.sid) return payload;

    const session = await this.prisma.userSession.findUnique({
      where: { id: payload.sid },
      select: { revokedAt: true, revokedReason: true },
    });
    if (!session || session.revokedAt) {
      throw new UnauthorizedException({
        code: SESSION_REPLACED,
        message:
          session?.revokedReason === 'replaced'
            ? SESSION_REPLACED_MESSAGE
            : 'Sesión finalizada, inicia sesión de nuevo',
      });
    }
    return payload;
  }
}
