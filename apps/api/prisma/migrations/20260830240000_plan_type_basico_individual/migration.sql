-- Los planes básicos por proveedor son para profesionales individuales.
UPDATE "plans"
SET "plan_type" = 'individual', "max_users" = 1
WHERE "id" IN (1, 2, 3);
