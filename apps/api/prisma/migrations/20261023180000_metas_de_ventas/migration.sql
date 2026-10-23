-- Metas mensuales de ventas por tipo de plan. Tabla nueva: no toca datos.
CREATE TABLE "sales_goals" (
    "id" BIGSERIAL NOT NULL,
    "month" VARCHAR(7) NOT NULL,
    "plan_type" TEXT NOT NULL,
    "target" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_goals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sales_goals_month_plan_type_key" ON "sales_goals"("month", "plan_type");
