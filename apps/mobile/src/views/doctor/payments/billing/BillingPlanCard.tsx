import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../../components/AppIcon';
import { Icons } from '../../../../components/icons';
import type { Subscription } from '../../../../types/subscription';
import type { BillingStyles } from '../styles/billing.styles';
import {
  billingCategory,
  CATEGORY_THEME,
  cardDate,
  creditsOf,
  formatDate,
  planIcon,
  planSubtitle,
  statusPillLabel,
} from './billingModel';

export function StatusPill({
  styles,
  sub,
}: {
  styles: BillingStyles;
  sub: Subscription;
}) {
  const theme = CATEGORY_THEME[billingCategory(sub)];
  return (
    <View
      style={[styles.pill, { backgroundColor: theme.bg, borderColor: theme.border }]}
    >
      <View style={[styles.chipDot, { width: 7, height: 7, backgroundColor: theme.fg }]} />
      <Text style={[styles.pillText, { color: theme.fg }]}>
        {statusPillLabel(sub)}
      </Text>
    </View>
  );
}

export function CreditsBar({
  styles,
  sub,
  showNumbers = true,
}: {
  styles: BillingStyles;
  sub: Subscription;
  showNumbers?: boolean;
}) {
  const theme = CATEGORY_THEME[billingCategory(sub)];
  const { left, total, pct } = creditsOf(sub);
  return (
    <View style={{ gap: 4 }}>
      {showNumbers ? (
        <Text style={styles.creditsText}>
          {left}
          <Text style={styles.creditsTotal}> / {total}</Text>
        </Text>
      ) : null}
      <View style={styles.creditsRow}>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              { width: `${pct}%`, backgroundColor: theme.bar },
            ]}
          />
        </View>
        <Text style={styles.pctText}>{pct}%</Text>
      </View>
    </View>
  );
}

export function PlanAvatar({
  styles,
  sub,
  size = 52,
  iconColor,
}: {
  styles: BillingStyles;
  sub: Subscription;
  size?: number;
  iconColor: string;
}) {
  const theme = CATEGORY_THEME[billingCategory(sub)];
  const cancelled = billingCategory(sub) === 'cancelled';
  return (
    <View
      style={[
        styles.planAvatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: cancelled ? theme.bg : '#EEF5FC',
          borderColor: cancelled ? theme.border : '#DCE8F5',
        },
      ]}
    >
      <AppIcon
        icon={cancelled ? Icons.creditCard : planIcon(sub)}
        size={Math.round(size * 0.5)}
        color={cancelled ? theme.fg : iconColor}
      />
    </View>
  );
}

export function BillingPlanCard({
  styles,
  sub,
  iconColor,
  onPress,
}: {
  styles: BillingStyles;
  sub: Subscription;
  iconColor: string;
  onPress: () => void;
}) {
  const theme = CATEGORY_THEME[billingCategory(sub)];
  const date = cardDate(sub);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.planCard,
        { backgroundColor: theme.bg, borderColor: theme.border },
        pressed && { opacity: 0.85 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Ver detalle de ${sub.plan.name}`}
    >
      <PlanAvatar styles={styles} sub={sub} iconColor={iconColor} />
      <View style={styles.planBody}>
        <View style={styles.planTop}>
          <Text style={styles.planName} numberOfLines={2}>
            {sub.plan.name}
          </Text>
          <StatusPill styles={styles} sub={sub} />
        </View>
        <Text style={styles.planSubtitle} numberOfLines={1}>
          {planSubtitle(sub)}
        </Text>
        <CreditsBar styles={styles} sub={sub} />
        <View style={styles.planDate}>
          <AppIcon icon={Icons.calendarDay} size={14} color="#64748B" />
          <Text style={styles.planDateText}>
            {date.label}: {formatDate(date.iso)}
          </Text>
        </View>
      </View>
      <AppIcon icon={Icons.chevronRight} size={22} color="#64748B" />
    </Pressable>
  );
}
