-- Sesiones activas por usuario: permite limitar sesiones simultáneas por rol
-- y revocar una sesión a distancia (el access token lleva su id en `sid`).
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "slot" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "revoked_reason" TEXT,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_sessions_user_id_slot_idx" ON "user_sessions"("user_id", "slot");

ALTER TABLE "user_sessions"
    ADD CONSTRAINT "user_sessions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
