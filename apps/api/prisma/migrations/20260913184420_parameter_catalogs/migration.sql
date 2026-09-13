-- CreateTable
CREATE TABLE "parameter_types" (
    "id" BIGSERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parameter_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parameters" (
    "id" BIGSERIAL NOT NULL,
    "type_id" BIGINT NOT NULL,
    "code" TEXT,
    "label" TEXT NOT NULL,
    "metadata" JSONB,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parameters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "parameter_types_slug_key" ON "parameter_types"("slug");

-- CreateIndex
CREATE INDEX "parameters_type_id_is_active_idx" ON "parameters"("type_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "parameters_type_id_label_key" ON "parameters"("type_id", "label");

-- AddForeignKey
ALTER TABLE "parameters" ADD CONSTRAINT "parameters_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "parameter_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
