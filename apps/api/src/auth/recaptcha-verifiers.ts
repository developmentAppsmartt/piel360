import { BadRequestException, Logger } from '@nestjs/common';
import { createSign, randomUUID } from 'crypto';

type SiteVerifyResponse = {
  success: boolean;
  'error-codes'?: string[];
};

type ServiceAccountJson = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

export async function fetchServiceAccountAccessToken(
  sa: ServiceAccountJson,
  logger: Logger,
): Promise<{ accessToken: string; expiresIn: number }> {
  const now = Math.floor(Date.now() / 1000);
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
    logger.error(
      `OAuth SA falló: ${tokenJson.error_description || tokenJson.error || tokenRes.status}`,
    );
    throw new BadRequestException(
      'No se pudo autenticar reCAPTCHA en el servidor.',
    );
  }
  return {
    accessToken: tokenJson.access_token,
    expiresIn: tokenJson.expires_in ?? 3600,
  };
}

export async function assertRecaptchaSiteverify(
  token: string,
  secret: string,
  logger: Logger,
) {
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
    logger.error(
      `No se pudo contactar siteverify: ${err instanceof Error ? err.message : String(err)}`,
    );
    throw new BadRequestException(
      'No se pudo verificar reCAPTCHA. Inténtalo de nuevo.',
    );
  }

  if (!data.success) {
    const codes = data['error-codes'] ?? [];
    logger.warn(
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
