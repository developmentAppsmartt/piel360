-- AlterTable
ALTER TABLE "analyses" ADD COLUMN "report_token" TEXT;
ALTER TABLE "analyses" ADD COLUMN "report_pdf_key" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "analyses_report_token_key" ON "analyses"("report_token");
