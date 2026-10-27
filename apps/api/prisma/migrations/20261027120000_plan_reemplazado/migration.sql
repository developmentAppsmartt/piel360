-- Un plan con compras no se edita: se publica otra fila y esta queda
-- marcada para que el catálogo no la vuelva a ofrecer.
ALTER TABLE "plans" ADD COLUMN "replaced_at" TIMESTAMP(3);
