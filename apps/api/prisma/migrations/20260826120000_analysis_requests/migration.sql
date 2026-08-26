-- CreateTable
CREATE TABLE "analysis_requests" (
    "id" BIGSERIAL NOT NULL,
    "patient_id" BIGINT NOT NULL,
    "doctor_id" BIGINT NOT NULL,
    "provider_slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analysis_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analysis_requests_patient_id_status_idx" ON "analysis_requests"("patient_id", "status");

-- CreateIndex
CREATE INDEX "analysis_requests_doctor_id_idx" ON "analysis_requests"("doctor_id");

-- AddForeignKey
ALTER TABLE "analysis_requests" ADD CONSTRAINT "analysis_requests_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_requests" ADD CONSTRAINT "analysis_requests_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
