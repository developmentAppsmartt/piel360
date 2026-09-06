/**
 * Plantilla visual de marca para los correos transaccionales — envuelve el
 * fragmento HTML de cada correo (`AuthService.sendOtp`/`forgotPassword`,
 * `DoctorsService.updateVerification`, etc.) en un documento con logo y
 * colores de marca reales del sistema (ver `apps/web/src/app/globals.css`).
 * Tabla + estilos inline porque los clientes de correo no soportan
 * flexbox/grid ni hojas de estilo externas.
 */

const BRAND_PRIMARY = '#1e5a9e';
const BRAND_DARK = '#0f3d73';
const BRAND_BG = '#f4f7fb';
const TEXT_COLOR = '#1a2b3c';
const FOOTER_COLOR = '#64748b';

export function renderBrandedEmail({
  frontendUrl,
  bodyHtml,
}: {
  frontendUrl: string;
  bodyHtml: string;
}): string {
  // logo-piel360.png es a color (ícono degradado + texto azul oscuro) —
  // necesita fondo claro, se pierde contra un header oscuro.
  const logoUrl = `${frontendUrl.replace(/\/$/, '')}/logo-piel360.png`;

  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background:${BRAND_BG};font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND_BG};padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:480px;width:100%;">
            <tr>
              <td align="center" style="background:#ffffff;padding:24px;border-bottom:3px solid ${BRAND_PRIMARY};">
                <img src="${logoUrl}" alt="Piel360" width="140" style="display:block;border:0;" />
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px;color:${TEXT_COLOR};font-size:15px;line-height:1.55;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;background:${BRAND_BG};color:${FOOTER_COLOR};font-size:12px;text-align:center;">
                — Equipo Piel360<br />Plataforma de diagnóstico dermatológico asistido por IA
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export { BRAND_PRIMARY, BRAND_DARK, BRAND_BG };
