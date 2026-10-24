-- Grupo y código del diagnóstico que deja el profesional al confirmar o
-- corregir un análisis dermatológico. Nulos = los reportes cuentan el de la IA.
-- Solo añade columnas: no reescribe ninguna fila.
ALTER TABLE "analyses" ADD COLUMN "final_diagnosis_code" TEXT;
ALTER TABLE "analyses" ADD COLUMN "final_diagnosis_category" TEXT;
