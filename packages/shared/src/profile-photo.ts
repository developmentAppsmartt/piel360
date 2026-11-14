/** Foto de perfil: lo que acepta `POST /me/avatar` y valida el web antes de enviar. */
export const PROFILE_PHOTO_MAX_BYTES = 10 * 1024 * 1024;

export const PROFILE_PHOTO_MIME = ["image/png", "image/jpeg"] as const;

export const PROFILE_PHOTO_TYPE_ERROR = "Solo se permiten fotos PNG o JPG.";
export const PROFILE_PHOTO_SIZE_ERROR =
  "La foto no puede pesar más de 10 MB.";

/** Mensaje de error para un archivo elegido, o null si se puede subir. */
export function profilePhotoError(file: {
  type: string;
  size: number;
}): string | null {
  if (!(PROFILE_PHOTO_MIME as readonly string[]).includes(file.type)) {
    return PROFILE_PHOTO_TYPE_ERROR;
  }
  if (file.size > PROFILE_PHOTO_MAX_BYTES) return PROFILE_PHOTO_SIZE_ERROR;
  return null;
}
