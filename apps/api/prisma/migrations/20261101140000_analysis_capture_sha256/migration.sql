-- La misma foto de un paciente no debe abrir otra tarea en el proveedor.
ALTER TABLE "analyses" ADD COLUMN "capture_sha256" TEXT;

CREATE INDEX "idx_analyses_patient_capture_sha" ON "analyses"("patient_id", "capture_sha256");
