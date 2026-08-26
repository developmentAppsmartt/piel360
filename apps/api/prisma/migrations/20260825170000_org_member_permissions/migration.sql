-- Permisos granulares por miembro de equipo
ALTER TABLE "organization_members"
  ADD COLUMN IF NOT EXISTS "permissions" JSONB NOT NULL DEFAULT '[]';
