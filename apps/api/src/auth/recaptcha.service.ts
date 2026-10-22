import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createSign, randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';

type SiteVerifyResponse = {
  success: boolean;
  'error-codes'?: string[];
};

type AssessmentResponse = {
  tokenProperties?: {
    valid?: boolean;
    action?: string;
    invalidReason?: string;
  };
  riskAnalysis?: {
    score?: number;
  };
  error?: {
    message?: string;
    status?: string;
  };
};

type ServiceAccountJson = {
  client_email: string;
  private_key: string;
  token_uri?: string;
  project_id?: string;
};

/**
 * Verifica tokens de reCAPTCHA Enterprise vía CreateAssessment.
 * Auth: API key (RECAPTCHA_API_KEY) o cuenta de servicio (JSON en
 * RECAPTCHA_SERVICE_ACCOUNT_PATH / .secrets/recaptcha-sa.json).
 * Fallback: siteverify solo si no hay credenciales de assessment.
 */
@Injectable()
export class RecaptchaService {
  private readonly logger = new Logger(RecaptchaService.name);
  private cachedAccessToken: { value: string; expiresAt: number } | null =
    null;

  constructor(private readonly config: ConfigService) {}

  private secret(): string | null {
    const value = this.config.get<string>('RECAPTCHA_SECRET_KEY')?.trim();
    return value || null;
  }

  private projectId(): string | null {
    const fromEnv = this.config.get<string>('RECAPTCHA_PROJECT_ID')?.trim();
    if (fromEnv) return fromEnv;
    return this.loadServiceAccount()?.project_id?.trim() || null;
  }

  private apiKey(): string | null {
    const value = this.config.get<string>('RECAPTCHA_API_KEY')?.trim();
    return value || null;
  }

  private siteKey(platform?: 'android' | 'ios' | string): string | null {
    // En móvil no se puede caer a la key web: el token se acuñó con la key
    // de plataforma y CreateAssessment lo marca MALFORMED / inválido.
    if (platform === 'android') {
      return (
        this.config.get<string>('RECAPTCHA_ANDROID_SITE_KEY')?.trim() || null
      );
    }
    if (platform === 'ios') {
      return this.config.get<string>('RECAPTCHA_IOS_SITE_KEY')?.trim() || null;
    }
    const value = this.config.get<string>('RECAPTCHA_SITE_KEY')?.trim();
    return value || null;
  }

  /** Acciones del SDK móvil son `login` / `signup` (minúsculas). */
  private normalizeAction(action: string): string {
    const a = action.trim().toLowerCase();
    if (a === 'register' || a === 'signup') return 'signup';
    if (a === 'login') return 'login';
    return a;
  }

  private minScore(): number {
    const raw = this.config.get<string>('RECAPTCHA_MIN_SCORE')?.trim();
    const n = raw ? Number(raw) : 0.5;
    return Number.isFinite(n) ? n : 0.5;
  }

  private serviceAccountPath(): string {
    const fromEnv = this.config
      .get<string>('RECAPTCHA_SERVICE_ACCOUNT_PATH')
      ?.trim();
    if (fromEnv) return resolve(fromEnv);
    return resolve(process.cwd(), '.secrets/recaptcha-sa.json');
  }

  private loadServiceAccount(): ServiceAccountJson | null {
    try {
      const raw = readFileSync(this.serviceAccountPath(), 'utf8');
      const json = JSON.parse(raw) as ServiceAccountJson;
      if (!json.client_email || !json.private_key) return null;
      return json;
    } catch {
      return null;
    }
  }

  private canCreateAssessment(platform?: string): boolean {
    const projectId = this.projectId();
    const siteKey = this.siteKey(platform);
    if (!projectId || !siteKey) return false;
    return Boolean(this.apiKey() || this.loadServiceAccount());
  }

  /** `v2` = siteverify (checkbox clásico); `enterprise` = CreateAssessment. */
  private mode(): 'v2' | 'enterprise' {
    const raw = this.config.get<string>('RECAPTCHA_MODE')?.trim().toLowerCase();
    if (raw === 'v2' || raw === 'classic' || raw === 'siteverify') return 'v2';
    if (raw === 'enterprise') return 'enterprise';
    return this.secret() ? 'v2' : 'enterprise';
  }

  /** `RECAPTCHA_ENABLED=false` lo apaga aunque haya claves. */
  isEnabled(): boolean {
    const flag = this.config
      .get<string>('RECAPTCHA_ENABLED')
      ?.trim()
      .toLowerCase();
    if (flag === 'false' || flag === '0' || flag === 'off') return false;
    const ready =
      this.mode() === 'v2'
        ? Boolean(this.secret())
        : this.canCreateAssessment() || Boolean(this.secret());
    if (flag === 'true' || flag === '1' || flag === 'on') return ready;
    return ready;
  }

  async assertValid(
    token: string | undefined,
    options?: {
      required?: boolean;
      action?: string;
      /** Plataforma del SDK móvil (site key Android/iOS). */
      platform?: string;
    },
  ) {
    if (!this.isEnabled()) return;

    const required = options?.required ?? false;
    const trimmed = token?.trim() ?? '';
    const expectedAction = (options?.action ?? 'LOGIN').trim();
    const platform = options?.platform?.trim().toLowerCase();

    if (!trimmed) {
      if (required) {
        throw new BadRequestException(
          'No se pudo verificar reCAPTCHA. Inténtalo de nuevo.',
        );
      }
      return;
    }

    const secret = this.secret();
    if (this.mode() === 'v2' && secret) {
      await this.assertViaSiteverify(trimmed, secret);
      return;
    }

    if (platform === 'android' || platform === 'ios') {
      if (!this.siteKey(platform)) {
        this.logger.error(
          `Falta RECAPTCHA_${platform.toUpperCase()}_SITE_KEY para CreateAssessment`,
        );
        throw new BadRequestException(
          'No se pudo verificar reCAPTCHA. Inténtalo de nuevo.',
        );
      }
    }

    if (this.canCreateAssessment(platform)) {
      await this.assertViaAssessment(
        trimmed,
        this.normalizeAction(expectedAction),
        platform,
      );
      return;
    }

    if (secret) {
      await this.assertViaSiteverify(trimmed, secret);
      return;
    }

    if (required) {
      throw new BadRequestException(
        'No se pudo verificar reCAPTCHA. Inténtalo de nuevo.',
      );
    }
  }

  private async assertViaAssessment(
    token: string,
    expectedAction: string,
    platform?: string,
  ) {
    const projectId = this.projectId()!;
    const siteKey = this.siteKey(platform)!;
    const apiKey = this.apiKey();

    let data: AssessmentResponse;
    try {
      const url = apiKey
        ? `https://recaptchaenterprise.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/assessments?key=${encodeURIComponent(apiKey)}`
        : `https://recaptchaenterprise.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/assessments`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (!apiKey) {
        headers.Authorization = `Bearer ${await this.serviceAccountAccessToken()}`;
      }

      this.logger.log(
        `CreateAssessment platform=${platform ?? 'web'} key=…${siteKey.slice(-6)} action=${expectedAction} tokenLen=${token.length}`,
      );
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          event: {
            token,
            siteKey,
            expectedAction,
          },
        }),
      });
      data = (await response.json()) as AssessmentResponse;
      if (!response.ok && !data.tokenProperties) {
        this.logger.warn(
          `CreateAssessment HTTP ${response.status}: ${data.error?.message ?? JSON.stringify(data).slice(0, 200)}`,
        );
      }
    } catch (err) {
      this.logger.error(
        `No se pudo contactar CreateAssessment: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new BadRequestException(
        'No se pudo verificar reCAPTCHA. Inténtalo de nuevo.',
      );
    }

    if (data.error?.message) {
      this.logger.warn(`CreateAssessment error: ${data.error.message}`);
      throw new BadRequestException(
        'La verificación reCAPTCHA falló o expiró. Inténtalo de nuevo.',
      );
    }

    if (!data.tokenProperties?.valid) {
      const reason =
        data.tokenProperties?.invalidReason ?? 'sin detalle';
      this.logger.warn(
        `reCAPTCHA assessment inválido: reason=${reason} action=${data.tokenProperties?.action ?? ''} platform=${platform ?? 'web'}`,
      );
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('fs').appendFileSync(
          '/tmp/piel360-recaptcha.log',
          `${JSON.stringify({
            t: new Date().toISOString(),
            reason,
            action: data.tokenProperties?.action ?? '',
            platform: platform ?? 'web',
            score: data.riskAnalysis?.score,
            siteKeySuffix: siteKey.slice(-6),
          })}\n`,
        );
      } catch {
        /* diagnóstico local */
      }
      const isProd =
        this.config.get<string>('NODE_ENV')?.trim() === 'production';
      throw new BadRequestException(
        isProd
          ? 'La verificación reCAPTCHA falló o expiró. Inténtalo de nuevo.'
          : `reCAPTCHA inválido (${reason}). Revisa package/SHA-1 y “Admitir apps ajenas a Play Store”.`,
      );
    }

    const action = data.tokenProperties.action ?? '';
    const normalizedExpected = expectedAction;
    const normalizedGot = this.normalizeAction(action || expectedAction);
    if (action && normalizedGot !== normalizedExpected) {
      this.logger.warn(
        `reCAPTCHA action mismatch: got=${action} expected=${expectedAction}`,
      );
      throw new BadRequestException(
        'La verificación reCAPTCHA falló o expiró. Inténtalo de nuevo.',
      );
    }

    const score = data.riskAnalysis?.score;
    if (typeof score === 'number' && score < this.minScore()) {
      const isProd =
        this.config.get<string>('NODE_ENV')?.trim() === 'production';
      // Emulador / APK debug suelen puntuar 0 aunque el token sea válido.
      if (!isProd) {
        this.logger.warn(
          `reCAPTCHA score bajo en local (se acepta): ${score} < ${this.minScore()} platform=${platform ?? 'web'}`,
        );
        return;
      }
      this.logger.warn(`reCAPTCHA score bajo: ${score}`);
      throw new BadRequestException(
        'La verificación reCAPTCHA falló o expiró. Inténtalo de nuevo.',
      );
    }
  }

  private async serviceAccountAccessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (
      this.cachedAccessToken &&
      this.cachedAccessToken.expiresAt > now + 60
    ) {
      return this.cachedAccessToken.value;
    }

    const sa = this.loadServiceAccount();
    if (!sa) {
      throw new BadRequestException(
        'Falta la cuenta de servicio de reCAPTCHA en el servidor.',
      );
    }

    const header = Buffer.from(
      JSON.stringify({ alg: 'RS256', typ: 'JWT' }),
    ).toString('base64url');
    const claim = Buffer.from(
      JSON.stringify({
        iss: sa.client_email,
        scope: 'https://www.googleapis.com/auth/cloud-platform',
        aud: sa.token_uri || 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
        jti: randomUUID(),
      }),
    ).toString('base64url');
    const unsigned = `${header}.${claim}`;
    const signer = createSign('RSA-SHA256');
    signer.update(unsigned);
    signer.end();
    const signature = signer
      .sign(sa.private_key.replace(/\\n/g, '\n'))
      .toString('base64url');
    const assertion = `${unsigned}.${signature}`;

    const tokenRes = await fetch(
      sa.token_uri || 'https://oauth2.googleapis.com/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion,
        }).toString(),
      },
    );
    const tokenJson = (await tokenRes.json()) as {
      access_token?: string;
      expires_in?: number;
      error?: string;
      error_description?: string;
    };
    if (!tokenRes.ok || !tokenJson.access_token) {
      this.logger.error(
        `OAuth SA falló: ${tokenJson.error_description || tokenJson.error || tokenRes.status}`,
      );
      throw new BadRequestException(
        'No se pudo autenticar reCAPTCHA en el servidor.',
      );
    }

    this.cachedAccessToken = {
      value: tokenJson.access_token,
      expiresAt: now + (tokenJson.expires_in ?? 3600),
    };
    return tokenJson.access_token;
  }

  private async assertViaSiteverify(token: string, secret: string) {
    let data: SiteVerifyResponse;
    try {
      const response = await fetch(
        'https://www.google.com/recaptcha/api/siteverify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            secret,
            response: token,
          }).toString(),
        },
      );
      data = (await response.json()) as SiteVerifyResponse;
    } catch (err) {
      this.logger.error(
        `No se pudo contactar siteverify: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new BadRequestException(
        'No se pudo verificar reCAPTCHA. Inténtalo de nuevo.',
      );
    }

    if (!data.success) {
      const codes = data['error-codes'] ?? [];
      this.logger.warn(
        `reCAPTCHA siteverify inválido (len=${token.length}): ${codes.join(', ') || 'sin detalle'}`,
      );
      if (codes.includes('timeout-or-duplicate')) {
        throw new BadRequestException(
          'El captcha ya se usó o expiró. Vuelve a marcarlo e inicia sesión de inmediato.',
        );
      }
      if (
        codes.includes('invalid-input-response') ||
        codes.includes('bad-request')
      ) {
        throw new BadRequestException(
          'El captcha no es válido para este dominio. Completa el captcha de nuevo.',
        );
      }
      throw new BadRequestException(
        'La verificación reCAPTCHA falló. Inténtalo de nuevo.',
      );
    }
  }
}
