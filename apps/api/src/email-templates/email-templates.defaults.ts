/** Etiquetas opcionales para kinds conocidos (las plantillas nuevas usan kind libre). */

export const EMAIL_TEMPLATE_KIND_LABELS: Record<string, string> = {
  welcome: 'Bienvenida',
  plan_acquired: 'Plan adquirido',
  report_ready: 'Obtener informe',
  appointment_scheduled: 'Cita agendada',
  patient_invitation: 'Invitación de paciente',
  team_member_invitation: 'Invitación a miembro del equipo',
  doctor_verification_approved: 'Registro aprobado',
  doctor_verification_changes_requested: 'Registro — ajustes solicitados',
  doctor_verification_rejected: 'Registro rechazado',
  custom: 'Personalizada',
};

export interface EmailTemplateDefault {
  subject: string;
  bodyHtml: string;
}

/**
 * Contenido por defecto de los 7 eventos que sí disparan un envío real hoy
 * (ver ReportEmailService/AppointmentEmailService/PatientInviteService/
 * TeamInviteEmailService/VerificationEmailService) — una sola fuente de verdad para que el backend (al
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
  // Moderación del registro: las edita el moderador o el superadmin desde el
  // panel admin, y son de plataforma (`doctor_id` NULL).
  doctor_verification_rejected: {
    subject: 'PIEL360 — Tu solicitud de registro no fue aprobada',
    bodyHtml: `<p style="margin:0 0 14px;">Hola, <strong>{nombre} {apellido}</strong>:</p>
<p style="margin:0 0 14px;">Gracias por registrarte en PIEL360. Terminamos de revisar la información y la documentación que enviaste para crear tu cuenta.</p>
<p style="margin:0 0 16px;">Estado de tu registro: <strong style="color:#b91c1c;">RECHAZADO</strong></p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;font-size:14px;">
  <tr><td style="padding:4px 0;color:#64748b;">Nombre</td><td style="padding:4px 0;text-align:right;font-weight:bold;">{nombre} {apellido}</td></tr>
  <tr><td style="padding:4px 0;color:#64748b;">Correo electrónico</td><td style="padding:4px 0;text-align:right;font-weight:bold;">{email}</td></tr>
  <tr><td style="padding:4px 0;color:#64748b;">Estado</td><td style="padding:4px 0;text-align:right;font-weight:bold;">Rechazado</td></tr>
  <tr><td style="padding:4px 0;color:#64748b;">Fecha de revisión</td><td style="padding:4px 0;text-align:right;font-weight:bold;">{fecha_revision}</td></tr>
</table>
<p style="margin:0 0 8px;font-weight:bold;">Motivo del rechazo</p>
<blockquote style="margin:0 0 20px;border-left:3px solid #1e5a9e;padding:4px 0 4px 12px;color:#334155;">{observacion}</blockquote>
<p style="margin:0 0 14px;">Para presentar una nueva solicitud, entra a PIEL360 y actualiza la información que se te pide.</p>
<p style="text-align:center;margin:24px 0;">
  <a href="{url_registro}" style="display:inline-block;background:#1e5a9e;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">Corregir mi registro</a>
</p>
<p style="margin:0;">Si crees que hubo un error o necesitas ayuda, escribe a <strong>{correo_soporte}</strong>.</p>`,
  },
  doctor_verification_changes_requested: {
    subject: 'PIEL360 — Se requieren ajustes en tu registro',
    bodyHtml: `<p style="margin:0 0 14px;">Hola, <strong>{nombre} {apellido}</strong>:</p>
<p style="margin:0 0 14px;">Nuestro equipo revisó tu solicitud de registro en PIEL360. Recibimos tu información, pero necesitamos que ajustes algunas cosas antes de continuar con la verificación.</p>
<p style="margin:0 0 16px;">Estado de tu registro: <strong style="color:#b45309;">AJUSTES SOLICITADOS</strong></p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;font-size:14px;">
  <tr><td style="padding:4px 0;color:#64748b;">Nombre</td><td style="padding:4px 0;text-align:right;font-weight:bold;">{nombre} {apellido}</td></tr>
  <tr><td style="padding:4px 0;color:#64748b;">Correo electrónico</td><td style="padding:4px 0;text-align:right;font-weight:bold;">{email}</td></tr>
  <tr><td style="padding:4px 0;color:#64748b;">Estado</td><td style="padding:4px 0;text-align:right;font-weight:bold;">Ajustes solicitados</td></tr>
  <tr><td style="padding:4px 0;color:#64748b;">Fecha de revisión</td><td style="padding:4px 0;text-align:right;font-weight:bold;">{fecha_revision}</td></tr>
</table>
<p style="margin:0 0 8px;font-weight:bold;">Lo que debes ajustar</p>
<blockquote style="margin:0 0 20px;border-left:3px solid #1e5a9e;padding:4px 0 4px 12px;color:#334155;">{observacion}</blockquote>
<p style="margin:0 0 14px;">Entra a PIEL360, revisa las observaciones y actualiza la información o los documentos que te pedimos. Al guardarlos, tu solicitud vuelve a la cola de revisión.</p>
<p style="text-align:center;margin:24px 0;">
  <a href="{url_registro}" style="display:inline-block;background:#1e5a9e;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">Continuar mi registro</a>
</p>
<p style="margin:0;">Si tienes dudas, escribe a <strong>{correo_soporte}</strong>.</p>`,
  },
  doctor_verification_approved: {
    subject: '¡Tu cuenta PIEL360 ha sido aprobada!',
    bodyHtml: `<p style="margin:0 0 14px;">Hola, <strong>{nombre} {apellido}</strong>:</p>
<p style="margin:0 0 14px;">¡Tenemos buenas noticias! Terminamos de revisar tu información y tu documentación.</p>
<p style="margin:0 0 16px;">Estado de tu registro: <strong style="color:#15803d;">APROBADO</strong></p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;font-size:14px;">
  <tr><td style="padding:4px 0;color:#64748b;">Nombre</td><td style="padding:4px 0;text-align:right;font-weight:bold;">{nombre} {apellido}</td></tr>
  <tr><td style="padding:4px 0;color:#64748b;">Correo electrónico</td><td style="padding:4px 0;text-align:right;font-weight:bold;">{email}</td></tr>
  <tr><td style="padding:4px 0;color:#64748b;">Rol</td><td style="padding:4px 0;text-align:right;font-weight:bold;">{rol_profesional}</td></tr>
  <tr><td style="padding:4px 0;color:#64748b;">Estado</td><td style="padding:4px 0;text-align:right;font-weight:bold;">Aprobado</td></tr>
  <tr><td style="padding:4px 0;color:#64748b;">Fecha de aprobación</td><td style="padding:4px 0;text-align:right;font-weight:bold;">{fecha_revision}</td></tr>
</table>
<p style="margin:0 0 14px;">Tu cuenta quedó autorizada para entrar y usar PIEL360 con las funcionalidades y los permisos de tu perfil.</p>
<p style="text-align:center;margin:24px 0;">
  <a href="{url_plataforma}" style="display:inline-block;background:#1e5a9e;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">Ingresar a PIEL360</a>
</p>
<p style="margin:0 0 14px;">Desde la plataforma puedes gestionar tus pacientes, hacer análisis de piel y seguir sus resultados.</p>
<p style="margin:0;">¡Bienvenido a PIEL360! Si tienes dudas, escribe a <strong>{correo_soporte}</strong>.</p>`,
  },
  patient_invitation: {
    subject: 'Te invitamos a Piel360',
    bodyHtml: `<p>Hola {nombre},</p>
<p>{clinic_name} te invitó a usar Piel360 para dar seguimiento a la salud de tu piel.</p>
<p>Descarga la app y regístrate con este correo (<strong>{email}</strong>) para empezar.</p>
<p>— {clinic_name}</p>`,
  },
};
