import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PERMISSIONS_KEY } from './permissions.decorator';
import type { JwtPayload } from './types';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.getAllAndOverride<string>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermission) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user: JwtPayload }>();
    const user = request.user;

    // Superadmin: acceso total (evita fallos si el JWT no trae el catálogo completo).
    if (user?.role === 'superadmin') return true;

    if (!user || !user.permissions?.includes(requiredPermission)) {
      throw new ForbiddenException(
        'No tienes permiso para acceder a este recurso',
      );
    }

    return true;
  }
}
