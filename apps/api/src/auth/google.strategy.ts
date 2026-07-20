import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import {
  Strategy,
  type Profile,
  type VerifyCallback,
} from 'passport-google-oauth20';

export interface GoogleProfile {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  /** Rol pedido al iniciar el flujo (`?role=doctor|patient`), propagado vía `state`. */
  roleIntent: string | undefined;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    // GOOGLE_CLIENT_ID/SECRET pueden estar vacíos en local/CI (feature opcional
    // hasta que se configuren credenciales reales); passport-oauth2 exige un
    // string truthy en el constructor, así que se usa un placeholder — un
    // intento real de login simplemente fallará contra Google hasta configurarlas.
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID') || 'not-configured',
      clientSecret:
        config.get<string>('GOOGLE_CLIENT_SECRET') || 'not-configured',
      callbackURL:
        config.get<string>('GOOGLE_REDIRECT_URI') ||
        'http://localhost:3000/api/auth/google/callback',
      scope: ['email', 'profile'],
      passReqToCallback: true,
    });
  }

  validate(
    req: Request,
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(new Error('La cuenta de Google no tiene email público'), false);
      return;
    }

    const googleProfile: GoogleProfile = {
      googleId: profile.id,
      email,
      firstName: profile.name?.givenName ?? profile.displayName,
      lastName: profile.name?.familyName ?? '',
      roleIntent:
        typeof req.query.state === 'string' ? req.query.state : undefined,
    };

    done(null, googleProfile);
  }
}
