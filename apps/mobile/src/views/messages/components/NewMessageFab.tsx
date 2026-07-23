import { Pressable } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { Icons } from '../../../components/icons';
import type { MessagesStyles } from '../styles/messages.styles';

type NewMessageFabProps = {
  styles: MessagesStyles;
  onPress: () => void;
};

export function NewMessageFab({ styles, onPress }: NewMessageFabProps) {
  const onDark = styles.fabIcon.color as string;
  return (
    <Pressable
      style={styles.fab}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Nuevo mensaje"
    >
      <AppIcon icon={Icons.plus} size={28} color={onDark} />
    </Pressable>
  );
}
