import { Alert, AppState, Linking, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const ESQUEMA = 'piel360';

/**
 * Android 16 arranca el intent de cámara o galería pero no lo muestra
 * hasta el siguiente onResume. Si pasado un momento la app sigue en
 * primer plano, el selector no salió: abrir el propio scheme fuerza
 * ese resume. Si la cámara ya tomó el primer plano, no se toca.
 */
function despertarSiNoAbrio(pendiente: Promise<unknown>) {
  if (Platform.OS !== 'android' || Number(Platform.Version) < 36) return;
  const aviso = setTimeout(() => {
    if (AppState.currentState !== 'active') return;
    Linking.openURL(`${ESQUEMA}://`).catch(() => undefined);
  }, 700);
  pendiente.finally(() => clearTimeout(aviso));
}

async function permisoDe(origen: 'camera' | 'library'): Promise<boolean> {
  const actual =
    origen === 'camera'
      ? await ImagePicker.getCameraPermissionsAsync()
      : await ImagePicker.getMediaLibraryPermissionsAsync();
  if (actual.granted) return true;

  const permiso =
    origen === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  return permiso.granted;
}

/** La captura guiada abre la cámara dentro de la app. Sin permiso,
 * el activity nativo se cierra y parece que el botón no hizo nada. */
export async function camaraPermitida(): Promise<boolean> {
  return permisoDe('camera');
}

export async function elegirImagen(
  origen: 'camera' | 'library',
  opciones?: {
    editar?: boolean;
    relacion?: [number, number];
    calidad?: number;
  },
): Promise<ImagePicker.ImagePickerAsset | null> {
  const permitido = await permisoDe(origen);
  if (!permitido) {
    Alert.alert(
      origen === 'camera' ? 'Cámara' : 'Galería',
      origen === 'camera'
        ? 'Necesitamos permiso de cámara para continuar.'
        : 'Necesitamos acceso a la galería para continuar.',
    );
    return null;
  }

  const apertura =
    origen === 'camera'
      ? ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: opciones?.calidad ?? 0.95,
          allowsEditing: opciones?.editar ?? false,
          aspect: opciones?.relacion,
        })
      : ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: opciones?.calidad ?? 0.95,
          allowsEditing: opciones?.editar ?? false,
          aspect: opciones?.relacion,
        });
  despertarSiNoAbrio(apertura);

  const resultado = await apertura;
  if (resultado.canceled || !resultado.assets[0]?.uri) return null;
  return resultado.assets[0];
}
