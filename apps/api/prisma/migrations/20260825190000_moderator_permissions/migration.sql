-- AlterTable
ALTER TABLE "moderators" ADD COLUMN "permissions" JSONB NOT NULL DEFAULT '[]';

-- Backfill defaults for existing moderators (checklist ✅ without edit/delete)
UPDATE "moderators"
SET "permissions" = '[
  "view_registered_professionals",
  "view_pending_requests",
  "view_personal_info",
  "view_email_phone",
  "view_specialty",
  "view_license",
  "view_education_institution",
  "view_attached_documents",
  "download_documents",
  "review_document_validity",
  "compare_info_vs_documents",
  "request_corrections",
  "add_observations",
  "approve_professional",
  "reject_professional",
  "suspend_validation"
]'::jsonb
WHERE "permissions" = '[]'::jsonb;
