-- Color del header de la card comercial del plan
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "header_color" TEXT DEFAULT 'brand';
