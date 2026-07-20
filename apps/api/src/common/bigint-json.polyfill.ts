// Los IDs de Prisma son BigInt (bigint en Postgres) y JSON.stringify no sabe
// serializarlos por defecto ("Do not know how to serialize a BigInt"). Se
// devuelven como string en las respuestas JSON. Debe importarse antes de que
// cualquier controlador serialice una respuesta (main.ts y los tests e2e).
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function (
  this: bigint,
) {
  return this.toString();
};
