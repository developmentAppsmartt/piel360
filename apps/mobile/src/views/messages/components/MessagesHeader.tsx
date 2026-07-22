import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../../components/AppIcon';
import { Icons } from '../../../components/icons';
import type { MessagesStyles } from '../styles/messages.styles';

type MessagesHeaderProps = {
  styles: MessagesStyles;
  onSearch?: () => void;
};

export function MessagesHeader({ styles, onSearch }: MessagesHeaderProps) {
  const insets = useSafeAreaInsets();
  const onDark = styles.headerIcon.color as string;
  return (
    <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
      <Text style={styles.headerTitle}>Mensajes</Text>
      <Pressable
        onPress={onSearch}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Buscar mensajes"
      >
        <AppIcon icon={Icons.search} size={22} color={onDark} />
      </Pressable>
    </View>
  );
}
