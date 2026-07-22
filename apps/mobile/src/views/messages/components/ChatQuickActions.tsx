import { Alert, Pressable, ScrollView, Text } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { Icons, type AppIconName } from '../../../components/icons';
import type { ChatStyles } from '../styles/chat.styles';

const ACTIONS: { id: string; label: string; icon: AppIconName }[] = [
  { id: 'cita', label: 'Agendar Cita', icon: Icons.calendar },
  { id: 'receta', label: 'Ver Receta', icon: Icons.prescription },
  { id: 'resultado', label: 'Ver Resultado', icon: Icons.clipboard },
];

type ChatQuickActionsProps = {
  styles: ChatStyles;
};

export function ChatQuickActions({ styles }: ChatQuickActionsProps) {
  const onDark = styles.quickChipText.color as string;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.quickActionsBar}
      contentContainerStyle={styles.quickActions}
      keyboardShouldPersistTaps="handled"
    >
      {ACTIONS.map((action) => (
        <Pressable
          key={action.id}
          style={styles.quickChip}
          onPress={() =>
            Alert.alert(
              action.label,
              'Esta acción se conectará cuando el módulo correspondiente esté listo.',
            )
          }
        >
          <AppIcon icon={action.icon} size={14} color={onDark} />
          <Text style={styles.quickChipText}>{action.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
