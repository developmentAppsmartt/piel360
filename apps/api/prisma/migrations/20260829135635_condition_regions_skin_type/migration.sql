-- AlterTable
ALTER TABLE "analysis_results" ADD COLUMN     "skin_type" TEXT;

-- AlterTable
ALTER TABLE "routine_conditions" ADD COLUMN     "text_value" TEXT,
ALTER COLUMN "value" DROP NOT NULL;

-- AlterTable
ALTER TABLE "treatment_conditions" ADD COLUMN     "text_value" TEXT,
ALTER COLUMN "value" DROP NOT NULL;
