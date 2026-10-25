// @ts-check

/**
 * Ningún archivo de código pasa de 400 líneas.
 *
 * No es un capricho de formato: un archivo que crece así casi siempre está
 * haciendo más de una cosa, y es el primer síntoma del código espagueti.
 * Cuando el límite salte, la salida es **partir por responsabilidad**, no
 * apretar el código ni añadir el archivo a la lista de abajo.
 *
 * Se cuentan todas las líneas, también comentarios y blancos: es lo que se
 * lee al abrir el archivo.
 */
export const MAX_LINEAS = 400;

/**
 * Los archivos que YA estaban por encima el día que entró la regla. Son deuda
 * reconocida, no permiso: esta lista **solo puede encoger**. Al tocar uno de
 * ellos, pártelo y bórralo de aquí.
 *
 * Nunca se añade un archivo nuevo a esta lista.
 *
 * @param {string[]} excepciones rutas relativas a la raíz del paquete
 */
export function reglaMaxLineas(excepciones) {
  return [
    {
      rules: {
        "max-lines": [
          "error",
          { max: MAX_LINEAS, skipBlankLines: false, skipComments: false },
        ],
      },
    },
    {
      // Deuda heredada — ver el comentario de arriba antes de tocar esto.
      files: excepciones,
      rules: { "max-lines": "off" },
    },
  ];
}
