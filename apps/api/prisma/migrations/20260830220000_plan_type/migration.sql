-- Tipo de plan: individual (1 usuario) o business (equipos / empresas).
ALTER TABLE "plans" ADD COLUMN "plan_type" TEXT NOT NULL DEFAULT 'business';
