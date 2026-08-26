import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { cacheDirectory, copyAsync } from 'expo-file-system/legacy';

/**
 * En Android, ImagePicker suele devolver `content://…`.
 * Lo copiamos a caché como `file://` para poder leerlo.
 */
async function toFileUri(imageUri: string): Promise<string> {
  let uri = imageUri;

  if (
    Platform.OS === 'android' &&
    (uri.startsWith('content://') || uri.startsWith('ph://'))
  ) {
    if (!cacheDirectory) {
      throw new Error('No hay caché local para preparar la imagen.');
    }
    const dest = `${cacheDirectory}upload-${Date.now()}.jpg`;
    await copyAsync({ from: uri, to: dest });
    uri = dest;
  }

  if (uri.startsWith('/') && !uri.startsWith('file://')) {
    uri = `file://${uri}`;
  }

  return uri;
}

/**
 * Adjunta una imagen local a FormData compatible con Expo winter fetch
 * (SDK 52+): exige Blob/File con `.bytes()`, no el objeto `{ uri, name, type }`
 * clásico de React Native (ese provoca "Unsupported FormDataPart implementation").
 */
export async function appendImageField(
  form: FormData,
  field: string,
  imageUri: string,
  filename = 'photo.jpg',
): Promise<void> {
  if (Platform.OS === 'web') {
    const res = await fetch(imageUri);
    const blob = await res.blob();
    const type = blob.type || 'image/jpeg';
    const file = new globalThis.File([blob], filename, { type });
    form.append(field, file);
    return;
  }

  const uri = await toFileUri(imageUri);
  // expo-file-system File implementa Blob + bytes() → aceptado por convertFormDataAsync
  const expoFile = new File(uri);
  form.append(field, expoFile as unknown as Blob);
}

/** Adjunto genérico (chat, etc.) con el mismo formato compatible Expo. */
export async function appendLocalFileField(
  form: FormData,
  field: string,
  file: { uri: string; name: string; mimeType?: string },
): Promise<void> {
  if (Platform.OS === 'web') {
    const res = await fetch(file.uri);
    const blob = await res.blob();
    const type = file.mimeType || blob.type || 'application/octet-stream';
    form.append(field, new globalThis.File([blob], file.name, { type }));
    return;
  }

  const uri = await toFileUri(file.uri);
  form.append(field, new File(uri) as unknown as Blob);
}
