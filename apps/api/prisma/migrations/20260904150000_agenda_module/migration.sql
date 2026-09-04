-- Módulo Agenda en el panel clínico (Roles y permisos).

INSERT INTO "permissions" ("name", "slug", "label", "kind", "panel", "href", "sort_order", "parent_slug", "is_active")
VALUES
  (
    'clinical.agenda',
    'clinical.agenda',
    'Agenda',
    'component',
    'clinical',
    '/doctor/agenda',
    35,
    NULL,
    true
  )
ON CONFLICT ("slug") DO UPDATE SET
  "label" = EXCLUDED."label",
  "kind" = EXCLUDED."kind",
  "panel" = EXCLUDED."panel",
  "href" = EXCLUDED."href",
  "sort_order" = EXCLUDED."sort_order",
  "parent_slug" = EXCLUDED."parent_slug",
  "is_active" = true;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT p.id, r.id
FROM "permissions" p
CROSS JOIN "roles" r
WHERE p."slug" = 'clinical.agenda'
  AND r."name" IN ('superadmin', 'empresa', 'doctor')
ON CONFLICT DO NOTHING;

-- Horarios semanales
CREATE TABLE IF NOT EXISTS "doctor_weekly_slots" (
  "id" BIGSERIAL PRIMARY KEY,
  "doctor_id" BIGINT NOT NULL,
  "day_of_week" INTEGER NOT NULL,
  "start_time" TEXT NOT NULL,
  "end_time" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "doctor_weekly_slots_doctor_id_day_of_week_idx"
  ON "doctor_weekly_slots"("doctor_id", "day_of_week");

DO $$ BEGIN
  ALTER TABLE "doctor_weekly_slots"
    ADD CONSTRAINT "doctor_weekly_slots_doctor_id_fkey"
    FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Días bloqueados
CREATE TABLE IF NOT EXISTS "doctor_blocked_days" (
  "id" BIGSERIAL PRIMARY KEY,
  "doctor_id" BIGINT NOT NULL,
  "date" DATE NOT NULL,
  "reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "doctor_blocked_days_doctor_id_date_key"
  ON "doctor_blocked_days"("doctor_id", "date");

CREATE INDEX IF NOT EXISTS "doctor_blocked_days_doctor_id_date_idx"
  ON "doctor_blocked_days"("doctor_id", "date");

DO $$ BEGIN
  ALTER TABLE "doctor_blocked_days"
    ADD CONSTRAINT "doctor_blocked_days_doctor_id_fkey"
    FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Citas
CREATE TABLE IF NOT EXISTS "appointments" (
  "id" BIGSERIAL PRIMARY KEY,
  "doctor_id" BIGINT NOT NULL,
  "patient_id" BIGINT NOT NULL,
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'proposed',
  "initiated_by" TEXT NOT NULL,
  "title" TEXT,
  "notes" TEXT,
  "created_by_user_id" BIGINT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "appointments_doctor_id_starts_at_idx"
  ON "appointments"("doctor_id", "starts_at");
CREATE INDEX IF NOT EXISTS "appointments_patient_id_starts_at_idx"
  ON "appointments"("patient_id", "starts_at");
CREATE INDEX IF NOT EXISTS "appointments_status_idx"
  ON "appointments"("status");

DO $$ BEGIN
  ALTER TABLE "appointments"
    ADD CONSTRAINT "appointments_doctor_id_fkey"
    FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "appointments"
    ADD CONSTRAINT "appointments_patient_id_fkey"
    FOREIGN KEY ("patient_id") REFERENCES "patients"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
