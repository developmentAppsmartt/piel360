import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import {
  encodeOAuthState,
  isAllowedAppRedirect,
  type OAuthPlatform,
} from './oauth-state';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const role =
      typeof request.query.role === 'string' ? request.query.role : undefined;
    const platformRaw =
      typeof request.query.platform === 'string'
        ? request.query.platform
        : 'web';
    const platform: OAuthPlatform =
      platformRaw === 'mobile' ? 'mobile' : 'web';
    const redirectRaw =
      typeof request.query.redirect_uri === 'string'
        ? request.query.redirect_uri
        : undefined;
    const redirectUri =
      redirectRaw && isAllowedAppRedirect(redirectRaw)
        ? redirectRaw
        : undefined;
    return { state: encodeOAuthState(role, platform, redirectUri) };
  }
}
