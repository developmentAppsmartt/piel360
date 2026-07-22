import { Modal, Pressable, Text, View, StyleSheet } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { Icons } from '../../../components/icons';
import type { AppBranding } from '../../../config/branding.defaults';

type AuthFeedbackModalProps = {
  visible: boolean;
  variant: 'success' | 'error';
  title: string;
  message: string;
  buttonLabel: string;
  onAction: () => void;
  colors: AppBranding['colors'];
};

export function AuthFeedbackModal({
  visible,
  variant,
  title,
  message,
  buttonLabel,
  onAction,
  colors,
}: AuthFeedbackModalProps) {
  const accent = variant === 'success' ? colors.primary : '#EA580C';
  const icon = variant === 'success' ? Icons.smile : Icons.sad;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <AppIcon icon={icon} size={56} color={accent} />
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.muted }]}>
            {message}
          </Text>
          <Pressable
            style={[styles.button, { backgroundColor: accent }]}
            onPress={onAction}
          >
            <Text style={styles.buttonText}>{buttonLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 10, 18, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  button: {
    alignSelf: 'stretch',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
