import { Pressable, Text, View } from 'react-native';
import type { MessageTab } from '../../../types/messages';
import type { MessagesStyles } from '../styles/messages.styles';

const TABS: { key: MessageTab; label: string }[] = [
  { key: 'recientes', label: 'Recientes' },
  { key: 'sin_leer', label: 'Sin Leer' },
  { key: 'archivados', label: 'Archivados' },
];

type MessagesTabsProps = {
  styles: MessagesStyles;
  active: MessageTab;
  onChange: (tab: MessageTab) => void;
};

export function MessagesTabs({ styles, active, onChange }: MessagesTabsProps) {
  return (
    <View style={styles.tabs}>
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
