import { Alert } from 'react-native';
import { presentAppAlert, type AppNoticeButton } from './appNotice';

const alertWithNotice = (
  title: string,
  message?: string,
  buttons?: Array<{
    text?: string;
    style?: AppNoticeButton['style'];
    onPress?: () => void;
  }>,
) => {
  presentAppAlert(
    title,
    typeof message === 'string' ? message : undefined,
    Array.isArray(buttons)
      ? buttons.map((button) => ({
          text: button.text ?? 'OK',
          style: button.style,
          onPress: button.onPress,
        }))
      : undefined,
  );
};

if (!(Alert as { __piel360Patched?: boolean }).__piel360Patched) {
  Alert.alert = alertWithNotice as typeof Alert.alert;
  (Alert as { __piel360Patched?: boolean }).__piel360Patched = true;
}

