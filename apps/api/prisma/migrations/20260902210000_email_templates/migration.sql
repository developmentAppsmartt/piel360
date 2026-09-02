-- Plantillas de correo del profesional/empresa
CREATE TABLE IF NOT EXISTS "email_templates" (
  "id" BIGSERIAL PRIMARY KEY,
  "doctor_id" BIGINT NOT NULL,
  "kind" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "preheader" TEXT,
  "body_html" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_templates_doctor_id_fkey"
    FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "email_templates_doctor_id_kind_key"
  ON "email_templates"("doctor_id", "kind");

CREATE INDEX IF NOT EXISTS "email_templates_doctor_id_idx"
  ON "email_templates"("doctor_id");
