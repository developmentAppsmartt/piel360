-- AlterTable
ALTER TABLE "email_template_variables" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "email_templates" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "routine_conditions" ADD COLUMN     "value_to" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "treatment_conditions" ADD COLUMN     "value_to" DOUBLE PRECISION;
