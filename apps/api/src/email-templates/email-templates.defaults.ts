/** Etiquetas opcionales para kinds conocidos (las plantillas nuevas usan kind libre). */

export const EMAIL_TEMPLATE_KIND_LABELS: Record<string, string> = {
  welcome: 'Bienvenida',
  plan_acquired: 'Plan adquirido',
  report_ready: 'Obtener informe',
  appointment_scheduled: 'Cita agendada',
  patient_invitation: 'Invitación de paciente',
  custom: 'Personalizada',
};

export interface EmailTemplateDefault {
  subject: string;
  bodyHtml: string;
}

/**
 * Contenido por defecto de los 3 eventos que sí disparan un envío real hoy
 * (ver ReportEmailService/AppointmentEmailService/PatientInviteService) —
 * una sola fuente de verdad para que el backend (al enviar, si el doctor no
 * configuró nada) y el frontend (`GET /email-templates/by-kind/:kind`, para
 * mostrar "esto es lo que se manda si no lo tocas") nunca se desincronicen.
 */
export const EMAIL_TEMPLATE_DEFAULTS: Record<string, EmailTemplateDefault> = {
  report_ready: {
    subject: 'Tu reporte de salud de la piel ya está listo',
    bodyHtml: `<p>Hola {nombre},</p>
<p>Ya completamos el análisis de tu piel. Puedes ver tu reporte completo aquí:</p>
<p style="text-align:center;margin:24px 0;">
  <a href="{report_url}" style="display:inline-block;background:#1e5a9e;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">Ver mi reporte</a>
</p>
<p>— {clinic_name}</p>`,
  },
  appointment_scheduled: {
    subject: 'Tu cita quedó agendada',
    bodyHtml: `<p>Hola {nombre},</p>
<p>Tu cita <strong>{cita_titulo}</strong> quedó agendada para el <strong>{fecha_cita}</strong> a las <strong>{hora_cita}</strong>.</p>
<p>— {clinic_name}</p>`,
  },
  patient_invitation: {
    subject: 'Te invitamos a Piel360',
    bodyHtml: `<p>Hola {nombre},</p>
<p>{clinic_name} te invitó a usar Piel360 para dar seguimiento a la salud de tu piel.</p>
<p>Descarga la app y regístrate con este correo (<strong>{email}</strong>) para empezar.</p>
<p>— {clinic_name}</p>`,
  },
};
