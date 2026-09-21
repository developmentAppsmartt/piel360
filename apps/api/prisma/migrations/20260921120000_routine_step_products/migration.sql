-- RoutineStep pasa de 1 producto (product_id) a varios (routine_step_products).

CREATE TABLE "routine_step_products" (
    "id" BIGSERIAL NOT NULL,
    "step_id" BIGINT NOT NULL,
    "product_id" BIGINT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routine_step_products_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "routine_step_products_step_id_idx" ON "routine_step_products"("step_id");

CREATE INDEX "routine_step_products_product_id_idx" ON "routine_step_products"("product_id");

ALTER TABLE "routine_step_products"
    ADD CONSTRAINT "routine_step_products_step_id_fkey"
    FOREIGN KEY ("step_id") REFERENCES "routine_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "routine_step_products"
    ADD CONSTRAINT "routine_step_products_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: cada routine_steps.product_id existente se vuelve un link con order 0.
INSERT INTO "routine_step_products" ("step_id", "product_id", "order")
SELECT "id", "product_id", 0
FROM "routine_steps"
WHERE "product_id" IS NOT NULL;

-- Ya no hace falta el FK simple ni su índice — el vínculo vive en la tabla nueva.
DROP INDEX IF EXISTS "routine_steps_product_id_idx";

ALTER TABLE "routine_steps" DROP CONSTRAINT IF EXISTS "routine_steps_product_id_fkey";

ALTER TABLE "routine_steps" DROP COLUMN "product_id";
