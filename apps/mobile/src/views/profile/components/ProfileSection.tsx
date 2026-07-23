import { Text, View } from 'react-native';
import type { ProfileSectionConfig } from '../data/profileContent';
import type { ProfileStyles } from '../styles/profile.styles';
import { ProfileRow } from './ProfileRow';

type ProfileSectionProps = {
  styles: ProfileStyles;
  accentColor: string;
  section: ProfileSectionConfig;
  toggles: Record<string, boolean>;
  onToggle: (rowId: string, next: boolean) => void;
  onRowPress: (rowId: string) => void;
};

export function ProfileSection({
  styles,
  accentColor,
  section,
  toggles,
  onToggle,
  onRowPress,
}: ProfileSectionProps) {
  return (
    <View>
      <View style={styles.sectionTitle}>
        <Text style={styles.sectionTitleText}>{section.title}</Text>
      </View>
      <View style={styles.sectionCard}>
        {section.rows.map((row, index) => (
          <ProfileRow
            key={row.id}
            styles={styles}
            accentColor={accentColor}
            row={row}
            isLast={index === section.rows.length - 1}
            toggleValue={toggles[row.id]}
            onToggle={(next) => onToggle(row.id, next)}
            onPress={() => onRowPress(row.id)}
          />
        ))}
      </View>
    </View>
  );
}
