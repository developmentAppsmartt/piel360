import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AppIcon } from '../../../components/AppIcon';
import { Icons, type AppIconName } from '../../../components/icons';
import { useBranding } from '../../../context/BrandingContext';
import { ApiError } from '../../../services/api.client';
import {
  doctorsService,
  type DoctorProfile,
} from '../../../services/doctors.service';
import { subscriptionsService } from '../../../services/subscriptions.service';
import type { Subscription } from '../../../types/subscription';
import { DoctorHeader } from '../patients/components/DoctorHeader';
import { createDoctorPatientsStyles } from '../patients/styles/patients.styles';
import { BillingDataForm } from './billing/BillingDataForm';
import { BillingHistory } from './billing/BillingHistory';
import { BillingPlanCard } from './billing/BillingPlanCard';
import { BillingPlanDetail } from './billing/BillingPlanDetail';
import {
  billedInWindow,
  billingCategory,
  BILLING_WINDOW_DAYS,
  CATEGORY_SECTION,
  CATEGORY_THEME,
  FILTER_LABEL,
  formatCop,
  sortSubscriptions,
  SUPPORT_EMAIL,
  type BillingCategory,
  type BillingFilter,
  type BillingSort,
} from './billing/billingModel';
import { createBillingStyles } from './styles/billing.styles';
import { createPaymentsStyles } from './styles/payments.styles';

type PaymentsBillingViewProps = {
  onBack: () => void;
  onOpenMenu: () => void;
  onOpenMessages?: () => void;
};

type Screen =
  | { name: 'list' }
  | { name: 'detail'; subscriptionId: string }
  | { name: 'history' }
  | { name: 'billingData' };

const SCREEN_TITLE: Record<Screen['name'], string> = {
  list: 'Compras y facturación',
  detail: 'Detalle del plan',
  history: 'Historial de facturación',
  billingData: 'Datos de facturación',
};

const CATEGORIES: BillingCategory[] = ['active', 'consumed', 'cancelled'];

const SUMMARY_ICON: Record<BillingCategory, AppIconName> = {
  active: Icons.creditCard,
  consumed: Icons.clock,
  cancelled: Icons.alertCircle,
};

const SORT_LABEL: Record<BillingSort, string> = {
  recent: 'Más recientes',
  endsAt: 'Vigencia más próxima',
  name: 'Nombre del plan',
};

export function PaymentsBillingView({
  onBack,
  onOpenMenu,
  onOpenMessages,
}: PaymentsBillingViewProps) {
  const branding = useBranding();
  const headerStyles = useMemo(
    () => createDoctorPatientsStyles(branding.colors),
    [branding.colors],
  );
  const frame = useMemo(
    () => createPaymentsStyles(branding.colors),
    [branding.colors],
  );
  const styles = useMemo(
    () => createBillingStyles(branding.colors),
    [branding.colors],
  );

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stack, setStack] = useState<Screen[]>([{ name: 'list' }]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<BillingFilter>('all');
  const [sort, setSort] = useState<BillingSort>('recent');

  const screen = stack[stack.length - 1];

  const load = useCallback(async () => {
    setError(null);
    try {
      const [list, profile] = await Promise.all([
        subscriptionsService.listMine(),
        doctorsService.getMe().catch(() => null),
      ]);
      setSubscriptions(list);
      setDoctor(profile);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo cargar compras y facturación.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const push = (next: Screen) => setStack((prev) => [...prev, next]);
  const handleBack = () => {
    if (stack.length > 1) setStack((prev) => prev.slice(0, -1));
    else onBack();
  };

  const counts = useMemo(() => {
    const result: Record<BillingCategory, number> = {
      active: 0,
      consumed: 0,
      cancelled: 0,
    };
    for (const sub of subscriptions) result[billingCategory(sub)] += 1;
    return result;
  }, [subscriptions]);

  const billedTotal = useMemo(() => billedInWindow(subscriptions), [subscriptions]);

  const grouped = useMemo(() => {
    const term = query.trim().toLowerCase();
    const visible = sortSubscriptions(
      subscriptions.filter((sub) =>
        term ? sub.plan.name.toLowerCase().includes(term) : true,
      ),
      sort,
    );
    const result: Record<BillingCategory, Subscription[]> = {
      active: [],
      consumed: [],
      cancelled: [],
    };
    for (const sub of visible) result[billingCategory(sub)].push(sub);
    return result;
  }, [subscriptions, query, sort]);

  const selected =
    screen.name === 'detail'
      ? subscriptions.find((s) => s.id === screen.subscriptionId) ?? null
      : null;

  function openSort() {
    Alert.alert(
      'Ordenar planes',
      `Actual: ${SORT_LABEL[sort]}`,
      [
        ...(Object.keys(SORT_LABEL) as BillingSort[]).map((key) => ({
          text: SORT_LABEL[key],
          onPress: () => setSort(key),
        })),
        { text: 'Cancelar', style: 'cancel' as const },
      ],
    );
  }

  function openSupport() {
    Alert.alert(
      'Soporte de facturación',
      `Si necesitas un comprobante o ayuda con un cobro, escribe a ${SUPPORT_EMAIL} e incluye la referencia de la compra.`,
      [
        { text: 'Cerrar', style: 'cancel' },
        {
          text: 'Escribir',
          onPress: () => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`),
        },
      ],
    );
  }

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        void load();
      }}
      tintColor={branding.colors.primary}
    />
  );

  function renderList() {
    const sections = filter === 'all' ? CATEGORIES : [filter];
    const anyVisible = sections.some((c) => grouped[c].length > 0);

    return (
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        <Text style={styles.subtitle}>
          Consulta el estado de tus planes, créditos disponibles y facturación.
        </Text>

        {error ? <Text style={styles.emptyText}>{error}</Text> : null}

        <View style={styles.summaryRow}>
          {CATEGORIES.map((category) => {
            const theme = CATEGORY_THEME[category];
            const section = CATEGORY_SECTION[category];
            return (
              <Pressable
                key={category}
                style={[
                  styles.summaryCard,
                  { backgroundColor: theme.bg, borderColor: theme.border },
                ]}
                onPress={() => setFilter(category)}
                accessibilityRole="button"
                accessibilityLabel={`Filtrar ${section.summary}`}
              >
                <View style={[styles.summaryIcon, { backgroundColor: theme.border }]}>
                  <AppIcon icon={SUMMARY_ICON[category]} size={16} color={theme.fg} />
                </View>
                <Text style={[styles.summaryTitle, { color: theme.fg }]}>
                  {section.summary}
                </Text>
                <Text style={styles.summaryValue}>{counts[category]}</Text>
                <Text style={styles.summaryHint}>{section.summaryHint}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable style={styles.totalCard} onPress={() => push({ name: 'history' })}>
          <View style={styles.totalIcon}>
            <AppIcon icon={Icons.document} size={22} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.totalLabel}>Total de facturación</Text>
            <Text style={styles.totalValue}>{formatCop(billedTotal)}</Text>
            <Text style={styles.totalHint}>Últimos {BILLING_WINDOW_DAYS} días</Text>
          </View>
          <AppIcon icon={Icons.chevronRight} size={22} color={branding.colors.primary} />
        </Pressable>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <AppIcon icon={Icons.search} size={18} color={branding.colors.muted} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar por nombre del plan…"
              placeholderTextColor={branding.colors.muted}
              returnKeyType="search"
            />
          </View>
          <Pressable
            style={styles.filterBtn}
            onPress={openSort}
            accessibilityLabel="Ordenar planes"
          >
            <AppIcon icon={Icons.settings} size={18} color={branding.colors.primary} />
          </Pressable>
        </View>

        <View style={styles.chips}>
          {(['all', ...CATEGORIES] as BillingFilter[]).map((key) => {
            const active = filter === key;
            const count =
              key === 'all' ? subscriptions.length : counts[key as BillingCategory];
            return (
              <Pressable
                key={key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setFilter(key)}
              >
                {key !== 'all' ? (
                  <View
                    style={[
                      styles.chipDot,
                      { backgroundColor: CATEGORY_THEME[key as BillingCategory].bar },
                    ]}
                  />
                ) : null}
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {FILTER_LABEL[key]}
                </Text>
                <View style={[styles.chipCount, active && styles.chipCountActive]}>
                  <Text
                    style={[styles.chipCountText, active && styles.chipTextActive]}
                  >
                    {count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {!anyVisible ? (
          <Text style={styles.emptyText}>
            {subscriptions.length === 0
              ? 'Aún no tienes planes. Adquiere uno desde Planes y suscripciones.'
              : 'No hay planes que coincidan con la búsqueda.'}
          </Text>
        ) : null}

        {sections.map((category) => {
          const items = grouped[category];
          if (items.length === 0) return null;
          const theme = CATEGORY_THEME[category];
          const section = CATEGORY_SECTION[category];
          return (
            <View key={category} style={{ gap: 10 }}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionDot, { backgroundColor: theme.bar }]} />
                <Text style={styles.sectionTitle}>
                  {section.title}
                  {section.hint ? (
                    <Text style={[styles.sectionHint, { color: theme.fg }]}>
                      {' '}
                      {section.hint}
                    </Text>
                  ) : null}
                </Text>
                <View
                  style={[
                    styles.sectionCount,
                    { backgroundColor: theme.bg, borderColor: theme.border },
                  ]}
                >
                  <Text style={[styles.sectionCountText, { color: theme.fg }]}>
                    {items.length} {items.length === 1 ? 'plan' : 'planes'}
                  </Text>
                </View>
              </View>
              {items.map((sub) => (
                <BillingPlanCard
                  key={sub.id}
                  styles={styles}
                  sub={sub}
                  iconColor={branding.colors.primary}
                  onPress={() => push({ name: 'detail', subscriptionId: sub.id })}
                />
              ))}
            </View>
          );
        })}

        <Pressable style={styles.linkRow} onPress={() => push({ name: 'history' })}>
          <AppIcon icon={Icons.creditCard} size={18} color={branding.colors.primary} />
          <Text style={styles.linkRowText}>Historial de facturación</Text>
          <AppIcon icon={Icons.chevronRight} size={20} color="#64748B" />
        </Pressable>
        {doctor ? (
          <Pressable
            style={styles.linkRow}
            onPress={() => push({ name: 'billingData' })}
          >
            <AppIcon icon={Icons.doc} size={18} color={branding.colors.primary} />
            <Text style={styles.linkRowText}>Datos de facturación</Text>
            <AppIcon icon={Icons.chevronRight} size={20} color="#64748B" />
          </Pressable>
        ) : null}
      </ScrollView>
    );
  }

  function renderBody() {
    if (loading) {
      return (
        <View style={frame.loading}>
          <ActivityIndicator color={branding.colors.primary} />
        </View>
      );
    }
    if (screen.name === 'detail') {
      return selected ? (
        <BillingPlanDetail
          styles={styles}
          sub={selected}
          primaryColor={branding.colors.primary}
          onOpenHistory={() => push({ name: 'history' })}
        />
      ) : (
        <Text style={styles.emptyText}>Este plan ya no está disponible.</Text>
      );
    }
    if (screen.name === 'history') {
      return <BillingHistory styles={styles} subscriptions={subscriptions} />;
    }
    if (screen.name === 'billingData' && doctor) {
      return (
        <BillingDataForm
          styles={styles}
          doctor={doctor}
          mutedColor={branding.colors.muted}
          onSaved={setDoctor}
        />
      );
    }
    return renderList();
  }

  return (
    <View style={frame.screen}>
      <StatusBar style="light" />
      <DoctorHeader
        styles={headerStyles}
        showBack
        onBack={handleBack}
        onOpenMenu={onOpenMenu}
        onOpenMessages={onOpenMessages}
      />
      <View style={frame.card}>
        <View style={frame.cardHeader}>
          <Pressable
            style={frame.roundBtn}
            onPress={handleBack}
            accessibilityLabel="Volver"
          >
            <AppIcon icon={Icons.back} size={22} color={branding.colors.textOnDark} />
          </Pressable>
          <Text style={frame.cardTitle}>{SCREEN_TITLE[screen.name]}</Text>
          <Pressable
            style={frame.moreBtn}
            onPress={openSupport}
            accessibilityLabel="Soporte"
          >
            <AppIcon icon={Icons.support} size={20} color={branding.colors.muted} />
          </Pressable>
        </View>
        {renderBody()}
      </View>
    </View>
  );
}
