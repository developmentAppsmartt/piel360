import { Pressable, Switch, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { Icons, type AppIconName } from '../../../components/icons';
import type { ProfileRowConfig } from '../data/profileContent';
import type { ProfileStyles } from '../styles/profile.styles';

const PROFILE_ICONS: Record<NonNullable<ProfileRowConfig['icon']>, AppIconName> = {
  clock: Icons.clock,
  robot: Icons.robot,
  mail: Icons.mail,
  skin: Icons.skin,
  phone: Icons.phone,
  doc: Icons.doc,
  calendar: Icons.calendarDay,
  user: Icons.account,
  home: Icons.homeOutline,
  paw: Icons.paw,
};

type ProfileRowProps = {
  styles: ProfileStyles;
  accentColor: string;
  row: ProfileRowConfig;
  isLast: boolean;
  toggleValue?: boolean;
  onToggle?: (next: boolean) => void;
  onPress?: () => void;
};

export function ProfileRow({
  styles,
  accentColor,
  row,
  isLast,
  toggleValue,
  onToggle,
  onPress,
}: ProfileRowProps) {
  const showChevron = row.kind === 'nav';
  const muted = (styles.rowValue.color as string) || '#6B7280';

  const content = (
    <>
      {row.icon ? (
        <View style={styles.rowIcon}>
          <AppIcon icon={PROFILE_ICONS[row.icon]} size={18} color={accentColor} />
        </View>
      ) : null}
      <Text style={styles.rowLabel}>{row.label}</Text>
      {row.kind === 'toggle' ? (
        <Switch
          value={Boolean(toggleValue)}
          onValueChange={onToggle}
          trackColor={{ false: '#D1D5DB', true: accentColor }}
          thumbColor="#FFFFFF"
        />
      ) : (
        <>
          {row.value ? (
            <Text style={styles.rowValue} numberOfLines={1}>
              {row.value}
            </Text>
          ) : null}
          {showChevron ? (
            <AppIcon icon={Icons.chevronRight} size={20} color={muted} />
          ) : null}
        </>
      )}
    </>
  );

  if (row.kind === 'nav') {
    return (
      <Pressable
        style={[styles.row, !isLast && styles.rowBorder]}
        onPress={onPress}
        accessibilityRole="button"
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View style={[styles.row, !isLast && styles.rowBorder]}>{content}</View>
  );
}
