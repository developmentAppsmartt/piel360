-- Recordatorio de cita: días de anticipación por plantilla y marca de envío.
ALTER TABLE "email_templates" ADD COLUMN "days_before" INTEGER;
ALTER TABLE "appointments" ADD COLUMN "reminder_sent_at" TIMESTAMP(3);
