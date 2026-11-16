-- Contactos del formulario de la landing pública. Los valores de los CHECK son
-- los de packages/shared/src/leads.ts.

CREATE TABLE "leads" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "business" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "interest" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "plan_id" BIGINT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "leads_interest_check" CHECK ("interest" IN ('aesthetic', 'derm', 'both')),
    CONSTRAINT "leads_intent_check" CHECK ("intent" IN ('demo', 'meeting', 'custom_plan')),
    CONSTRAINT "leads_status_check" CHECK ("status" IN ('new', 'contacted', 'qualified', 'won', 'lost'))
);

CREATE INDEX "leads_status_created_at_idx" ON "leads"("status", "created_at");

-- Componente del panel admin para verlos.
INSERT INTO "permissions" ("name", "slug", "label", "description", "kind", "panel", "href", "sort_order", "parent_slug", "is_active")
VALUES (
  'admin.leads',
  'admin.leads',
  'Leads de la landing',
  'Contactos que llegan por el formulario de la página pública.',
  'component',
  'admin',
  '/admin/leads',
  95,
  NULL,
  true
)
ON CONFLICT ("slug") DO UPDATE SET
  "label" = EXCLUDED."label",
  "description" = EXCLUDED."description",
  "kind" = EXCLUDED."kind",
  "panel" = EXCLUDED."panel",
  "href" = EXCLUDED."href",
  "sort_order" = EXCLUDED."sort_order",
  "is_active" = EXCLUDED."is_active";

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT p."id", r."id"
FROM "permissions" p
CROSS JOIN "roles" r
WHERE p."slug" = 'admin.leads'
  AND r."name" = 'superadmin'
ON CONFLICT DO NOTHING;
