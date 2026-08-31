-- Paquetes de análisis: un plan empresas puede incluir 1, 2 o los 3 proveedores.
ALTER TABLE "plans" ADD COLUMN "analysis_provider_ids" JSONB NOT NULL DEFAULT '[]';

UPDATE "plans"
SET "analysis_provider_ids" = jsonb_build_array("analysis_provider_id"::text)
WHERE jsonb_array_length("analysis_provider_ids") = 0;
