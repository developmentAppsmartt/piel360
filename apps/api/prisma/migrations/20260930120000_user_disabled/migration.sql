-- Deshabilitar cuentas de profesionales / empresas con motivo visible al usuario.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "disabled_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "disabled_reason" TEXT;
