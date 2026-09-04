import { Alert, Platform } from 'react-native';

/**
 * Confirmación multiplataforma. En web, `Alert.alert` con botones no ejecuta
 * `onPress`; usamos `window.confirm`.
 */
export function confirmAction(options: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}): Promise<boolean> {
  const {
    title,
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    destructive = false,
  } = options;

  if (Platform.OS === 'web') {
    const text = title ? `${title}\n\n${message}` : message;
    return Promise.resolve(
      typeof window !== 'undefined' ? window.confirm(text) : false,
    );
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmLabel,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}
