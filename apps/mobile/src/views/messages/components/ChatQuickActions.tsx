import { Pressable, ScrollView, Text } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { Icons, type AppIconName } from '../../../components/icons';
import type { ChatStyles } from '../styles/chat.styles';

export type ChatQuickActionId = 'cita' | 'receta' | 'resultado';

const ACTIONS: {
  id: ChatQuickActionId;
  label: string;
  icon: AppIconName;
}[] = [
  { id: 'cita', label: 'Agendar Cita', icon: Icons.calendar },
  { id: 'receta', label: 'Ver Receta', icon: Icons.prescription },
  { id: 'resultado', label: 'Ver Resultado', icon: Icons.clipboard },
];

type ChatQuickActionsProps = {
  styles: ChatStyles;
  onAction?: (id: ChatQuickActionId) => void;
  /** Si se omite, se muestran las tres acciones. */
  visibleIds?: ChatQuickActionId[];
};

export function ChatQuickActions({
  styles,
  onAction,
  visibleIds,
}: ChatQuickActionsProps) {
  const onDark = styles.quickChipText.color as string;
  const actions = visibleIds
    ? ACTIONS.filter((a) => visibleIds.includes(a.id))
    : ACTIONS;

  if (actions.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.quickActionsBar}
      contentContainerStyle={styles.quickActions}
      keyboardShouldPersistTaps="handled"
    >
      {actions.map((action) => (
        <Pressable
          key={action.id}
          style={styles.quickChip}
          onPress={() => onAction?.(action.id)}
        >
          <AppIcon icon={action.icon} size={14} color={onDark} />
          <Text style={styles.quickChipText}>{action.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
