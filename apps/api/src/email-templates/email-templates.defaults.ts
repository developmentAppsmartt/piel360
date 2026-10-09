/** Etiquetas opcionales para kinds conocidos (las plantillas nuevas usan kind libre). */

export const EMAIL_TEMPLATE_KIND_LABELS: Record<string, string> = {
  welcome: 'Bienvenida',
  plan_acquired: 'Plan adquirido',
  report_ready: 'Obtener informe',
  appointment_scheduled: 'Cita agendada',
  patient_invitation: 'Invitación de paciente',
  team_member_invitation: 'Invitación a miembro del equipo',
  custom: 'Personalizada',
};

export interface EmailTemplateDefault {
  subject: string;
  bodyHtml: string;
}

/**
 * Contenido por defecto de los 4 eventos que sí disparan un envío real hoy
 * (ver ReportEmailService/AppointmentEmailService/PatientInviteService/
 * TeamInviteEmailService) — una sola fuente de verdad para que el backend (al
 * enviar, si el doctor no configuró nada) y el frontend
 * (`GET /email-templates/by-kind/:kind`, para mostrar "esto es lo que se manda
 * si no lo tocas") nunca se desincronicen.
 *
 * El cuerpo es un fragmento: `MailService` lo envuelve en
 * `renderBrandedEmail`, que ya pone el logo arriba y el pie de Piel360 abajo.
 * Repetirlos acá saca el correo con dos cabeceras.
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
  team_member_invitation: {
    subject: 'Invitación para completar tu registro en Piel360',
    bodyHtml: `<p style="margin:0 0 14px;">Hola <strong>{nombre} {apellido}</strong>:</p>
<p style="margin:0 0 14px;"><strong>{clinic_name}</strong> te ha invitado a formar parte de su equipo en PIEL360, la plataforma inteligente para el análisis, seguimiento y gestión de la piel.</p>
<p style="margin:0 0 20px;">Para empezar a usarla como <strong>{rol_profesional}</strong>, primero tienes que completar tu registro y tu validación profesional.</p>
<p style="margin:0 0 8px;font-weight:bold;">Tus datos de acceso</p>
<p style="margin:0 0 14px;">Correo electrónico: <strong>{email}</strong><br />Clave temporal: <strong>{clave_temporal}</strong></p>
<p style="margin:0 0 20px;">Por seguridad, cámbiala en cuanto entres, desde Configuración.</p>
<p style="margin:0 0 8px;font-weight:bold;">Completa tu registro</p>
<p style="margin:0 0 14px;">Entra con esos datos y ve a <strong>Configuración &rsaquo; Perfil</strong> para registrar tu información profesional y adjuntar los documentos que se te piden. Hasta que los envíes, tu cuenta queda limitada.</p>
<p style="text-align:center;margin:24px 0;">
  <a href="{url_registro}" style="display:inline-block;background:#1e5a9e;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">Completar mi registro</a>
</p>
<p style="margin:0 0 20px;">Cuando termines, revisaremos la información y actualizaremos el estado de tu cuenta.</p>
<p style="margin:0 0 8px;font-weight:bold;">Importante</p>
<p style="margin:0;">No compartas tu clave temporal con nadie. Si no reconoces esta invitación, escribe a <strong>{correo_soporte}</strong>.</p>`,
  },
  patient_invitation: {
    subject: 'Te invitamos a Piel360',
    bodyHtml: `<p>Hola {nombre},</p>
<p>{clinic_name} te invitó a usar Piel360 para dar seguimiento a la salud de tu piel.</p>
<p>Descarga la app y regístrate con este correo (<strong>{email}</strong>) para empezar.</p>
<p>— {clinic_name}</p>`,
  },
};
