import { Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

function extensionFromUrl(url: string, mimeType?: string | null): string {
  if (mimeType?.includes('png')) return 'png';
  if (mimeType?.includes('webp')) return 'webp';
  if (mimeType?.includes('jpeg') || mimeType?.includes('jpg')) return 'jpg';
  const path = url.split('?')[0] ?? url;
  const match = path.match(/\.([a-zA-Z0-9]+)$/);
  return match?.[1]?.toLowerCase() ?? 'jpg';
}

/** Descarga/comparte una imagen del chat (profesional → análisis dermatológico). */
export async function downloadChatImage(params: {
  url: string;
  name?: string;
  mimeType?: string | null;
}): Promise<void> {
  const { url, name, mimeType } = params;
  const ext = extensionFromUrl(url, mimeType);
  const safeName = (name?.replace(/[^\w.-]+/g, '_') || `piel360-imagen`).replace(
    /\.(png|jpe?g|webp)$/i,
    '',
  );
  const filename = `${safeName}.${ext}`;

  if (Platform.OS === 'web') {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('No se pudo descargar la imagen.');
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
    return;
  }

  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error('No hay carpeta de caché para guardar la imagen.');
  }
  const dest = `${cacheDir}${filename}`;
  const downloaded = await FileSystem.downloadAsync(url, dest);
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    Alert.alert('Imagen lista', `Guardada en: ${downloaded.uri}`);
    return;
  }
  await Sharing.shareAsync(downloaded.uri, {
    mimeType: mimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    dialogTitle: 'Descargar imagen para análisis',
  });
}
