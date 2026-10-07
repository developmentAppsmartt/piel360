-- La configuración de rangos ya no define puntaje por defecto (real/modificado).
ALTER TABLE "account_score_configs" DROP COLUMN "default_mode";
