CREATE TABLE IF NOT EXISTS "email_template_variables" (
  "id" BIGSERIAL PRIMARY KEY,
  "doctor_id" BIGINT NOT NULL,
  "key" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "sample_value" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_template_variables_doctor_id_fkey"
    FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "email_template_variables_doctor_id_key_key"
  ON "email_template_variables"("doctor_id", "key");

CREATE INDEX IF NOT EXISTS "email_template_variables_doctor_id_idx"
  ON "email_template_variables"("doctor_id");
