-- Miniatura de la foto de perfil para las listas (ver users/avatar-thumb.ts).
-- Las fotos que ya existen la reciben al arrancar el API (AvatarThumbBackfill).
ALTER TABLE "users" ADD COLUMN "avatar_thumb_key" TEXT;
