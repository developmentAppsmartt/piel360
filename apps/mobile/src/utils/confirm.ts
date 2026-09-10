import { presentAppAlert } from '../components/notices/appNotice';

/**
 * Confirmación con la ventana de aviso de la app (no el Alert nativo).
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

  return new Promise((resolve) => {
    presentAppAlert(title, message, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmLabel,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}
