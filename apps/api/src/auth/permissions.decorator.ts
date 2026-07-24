import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permission';
export const RequirePermission = (permission: string) =>
  SetMetadata(PERMISSIONS_KEY, permission);
