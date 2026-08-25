-- Perfiles de moderadores (rol RBAC monitor)
CREATE TABLE IF NOT EXISTS "moderators" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "doc_type" TEXT,
    "doc_number" TEXT,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderators_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "moderators_user_id_key" ON "moderators"("user_id");

ALTER TABLE "moderators"
  DROP CONSTRAINT IF EXISTS "moderators_user_id_fkey";
ALTER TABLE "moderators"
  ADD CONSTRAINT "moderators_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
