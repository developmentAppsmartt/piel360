import { ScrollView, Text, View } from 'react-native';
import type { Subscription } from '../../../../types/subscription';
import type { BillingStyles } from '../styles/billing.styles';
import { StatusPill } from './BillingPlanCard';
import {
  amountPaid,
  formatCop,
  formatDate,
  planSubtitle,
  purchaseDate,
} from './billingModel';

export function BillingHistory({
  styles,
  subscriptions,
}: {
  styles: BillingStyles;
  subscriptions: Subscription[];
}) {
  const ordered = [...subscriptions].sort(
    (a, b) =>
      new Date(purchaseDate(b)).getTime() - new Date(purchaseDate(a)).getTime(),
  );
  const paidTotal = ordered
    .filter((s) => s.status === 'active')
    .reduce((sum, s) => sum + amountPaid(s), 0);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.subtitle}>
        Todas tus compras de planes y su referencia de pago. Los cobros se
        procesan con Wompi.
      </Text>

      <View style={styles.totalCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.totalLabel}>Total pagado</Text>
          <Text style={styles.totalValue}>{formatCop(paidTotal)}</Text>
          <Text style={styles.totalHint}>
            {ordered.length} {ordered.length === 1 ? 'compra' : 'compras'} registradas
          </Text>
        </View>
      </View>

      {ordered.length === 0 ? (
        <Text style={styles.emptyText}>Aún no hay compras registradas.</Text>
      ) : (
        ordered.map((sub) => (
          <View key={sub.id} style={styles.historyItem}>
            <View style={styles.historyTop}>
              <Text style={styles.historyName} numberOfLines={1}>
                {sub.plan.name}
              </Text>
              <Text style={styles.historyAmount}>
                {formatCop(amountPaid(sub))}
              </Text>
            </View>
            <Text style={styles.historyMeta}>{planSubtitle(sub)}</Text>
            <View style={[styles.historyTop, { marginTop: 4 }]}>
              <Text style={[styles.historyMeta, { flex: 1 }]}>
                {formatDate(purchaseDate(sub))} · Ref.{' '}
                {sub.wompiTransactionId?.trim() || 'sin referencia'}
              </Text>
              <StatusPill styles={styles} sub={sub} />
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}
