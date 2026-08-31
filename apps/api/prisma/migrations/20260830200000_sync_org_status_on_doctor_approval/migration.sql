-- Al aprobar un doctor empresa, la organización debe quedar activa (antes quedaba en pending).
UPDATE "organizations" AS o
SET "status" = 'active'
FROM "doctors" AS d
WHERE o."owner_user_id" = d."user_id"
  AND d."verification_status" IN ('active', 'approved')
  AND o."status" = 'pending';
