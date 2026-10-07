-- Identidad corporativa (Configuración → Personalización) del dueño de la cuenta.
CREATE TABLE "account_brandings" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "public_id" TEXT NOT NULL,
    "primary_color" TEXT,
    "secondary_color" TEXT,
    "button_color" TEXT,
    "gradient_start_color" TEXT,
    "gradient_end_color" TEXT,
    "login_background_key" TEXT,
    "login_logo_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_brandings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "account_brandings_user_id_key" ON "account_brandings"("user_id");

CREATE UNIQUE INDEX "account_brandings_public_id_key" ON "account_brandings"("public_id");

ALTER TABLE "account_brandings" ADD CONSTRAINT "account_brandings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
