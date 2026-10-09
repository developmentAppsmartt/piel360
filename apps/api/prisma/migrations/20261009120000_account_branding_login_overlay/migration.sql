-- Permite quitar el degradado oscuro del login sobre la imagen de fondo.
ALTER TABLE "account_brandings" ADD COLUMN "login_overlay" BOOLEAN NOT NULL DEFAULT true;
