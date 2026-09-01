import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  DOCTOR_PANEL_ROLES,
  hasClinicalModulePermission,
  type Role,
} from '@piel360/shared';
import type { Request } from 'express';
import { ROLES_KEY } from './roles.decorator';
import type { JwtPayload } from './types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user: JwtPayload }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException(
        'No tienes permiso para acceder a este recurso',
      );
    }

    if (user.role === 'superadmin') return true;

    if (requiredRoles.includes(user.role)) return true;

    const requiresClinicalPanel = requiredRoles.some((role) =>
      (DOCTOR_PANEL_ROLES as readonly Role[]).includes(role),
    );
    if (
      requiresClinicalPanel &&
      hasClinicalModulePermission(user.permissions)
    ) {
      return true;
    }

    throw new ForbiddenException(
      'No tienes permiso para acceder a este recurso',
    );
  }
}
