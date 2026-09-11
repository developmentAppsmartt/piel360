import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AppIcon } from '../../../components/AppIcon';
import { Icons } from '../../../components/icons';
import { useBranding } from '../../../context/BrandingContext';
import { ApiError } from '../../../services/api.client';
import { plansService, type CatalogPlan } from '../../../services/plans.service';
import { subscriptionsService } from '../../../services/subscriptions.service';
import type {
  Subscription,
  SubscriptionStatus,
} from '../../../types/subscription';
import { DoctorHeader } from '../patients/components/DoctorHeader';
import { createDoctorPatientsStyles } from '../patients/styles/patients.styles';
import { createPaymentsStyles } from './styles/payments.styles';

const SUPPORT_EMAIL = 'soporte@piel360.com';
const PLANS_WEB_URL = 'https://piel360.com/doctor/planes';

type PaymentsViewProps = {
  onBack: () => void;
  onOpenMenu: () => void;
  onOpenMessages?: () => void;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

function formatPrice(price: string): string {
  const n = Number(price);
  if (Number.isNaN(n)) return price;
  return `$${n.toFixed(2)}`;
}

function statusLabel(status: SubscriptionStatus): string {
  if (status === 'active') return 'Activa';
  if (status === 'cancelled') return 'Cancelada';
  return 'Pendiente';
}

function planProviders(plan: CatalogPlan): string {
  const list = plan.providers?.length
    ? plan.providers
    : [plan.provider];
  return list
    .map((p) => p.displayLabel?.trim() || p.name)
    .join(' · ');
}

export function PaymentsView({
  onBack,
  onOpenMenu,
  onOpenMessages,
}: PaymentsViewProps) {
  const branding = useBranding();
  const headerStyles = useMemo(
    () => createDoctorPatientsStyles(branding.colors),
    [branding.colors],
  );
  const styles = useMemo(
    () => createPaymentsStyles(branding.colors),
    [branding.colors],
  );

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<CatalogPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [mine, catalog] = await Promise.all([
        subscriptionsService.listMine(),
        plansService.list().catch(() => [] as CatalogPlan[]),
      ]);
      setSubscriptions(mine);
      setPlans(catalog);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudieron cargar los planes.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeSubs = useMemo(
    () => subscriptions.filter((s) => s.status === 'active'),
    [subscriptions],
  );

  function openContract(plan: CatalogPlan) {
    if (plan.poolPurchasable === false) {
      Alert.alert(
        plan.name,
        plan.poolUnavailableReason?.trim() ||
          'Este plan no está disponible para contratación en este momento.',
      );
      return;
    }
    Alert.alert(
      plan.name,
      `${formatPrice(plan.price)} · ${plan.analysisLimit} análisis · ${plan.durationDays} días.\n\nLa contratación se completa en el panel web de profesionales.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Abrir planes',
          onPress: () => void Linking.openURL(PLANS_WEB_URL),
        },
      ],
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <DoctorHeader
        styles={headerStyles}
        onOpenMenu={onOpenMenu}
        onOpenMessages={onOpenMessages}
        onOpenGift={() =>
          Alert.alert(
            'Premios',
            'Aquí verás recompensas y beneficios de Piel 360. Este módulo se activará en una próxima versión.',
          )
        }
      />

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Pressable
            style={styles.roundBtn}
            onPress={onBack}
            accessibilityLabel="Volver"
          >
            <AppIcon icon={Icons.back} size={22} color={branding.colors.textOnDark} />
          </Pressable>
          <Text style={styles.cardTitle}>Planes y suscripciones</Text>
          <Pressable
            style={styles.moreBtn}
            onPress={() =>
              Alert.alert(
                'Soporte de facturación',
                `Si necesitas ayuda con un plan o un cobro, escribe a ${SUPPORT_EMAIL}.`,
                [
                  { text: 'Cerrar', style: 'cancel' },
                  {
                    text: 'Escribir',
                    onPress: () =>
                      void Linking.openURL(`mailto:${SUPPORT_EMAIL}`),
                  },
                ],
              )
            }
            accessibilityLabel="Soporte"
          >
            <AppIcon
              icon={Icons.support}
              size={20}
              color={branding.colors.muted}
            />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={branding.colors.primary} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  void load();
                }}
                tintColor={branding.colors.primary}
              />
            }
          >
            {error ? (
              <Text style={[styles.emptyText, { padding: 16 }]}>{error}</Text>
            ) : null}

            <View style={styles.block}>
              <Text style={styles.sectionTitle}>Tus suscripciones</Text>
              <Text style={styles.sectionHint}>
                Planes activos y créditos restantes de tu consulta.
              </Text>
              {activeSubs.length === 0 ? (
                <Text style={styles.emptyText}>
                  No tienes suscripciones activas. Elige un plan disponible
                  abajo.
                </Text>
              ) : (
                activeSubs.map((item) => (
                  <View key={item.id} style={[styles.planCard, { marginBottom: 10 }]}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {statusLabel(item.status)}
                      </Text>
                    </View>
                    <Text style={styles.planName}>{item.plan.name}</Text>
                    <Text style={styles.planMeta}>
                      {item.plan.provider.displayLabel?.trim() ||
                        item.plan.provider.name}
                    </Text>
                    <Text style={styles.planMeta}>
                      {item.remainingCredits} créditos restantes · vence{' '}
                      {item.endsAt ? formatDate(item.endsAt) : '—'}
                    </Text>
                    <Text style={styles.planPrice}>
                      {formatPrice(item.plan.price)}
                    </Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.block}>
              <Text style={styles.sectionTitle}>Planes disponibles</Text>
              <Text style={styles.sectionHint}>
                Contrata análisis de IA según tu práctica profesional.
              </Text>
              {plans.length === 0 ? (
                <Text style={styles.emptyText}>
                  No hay planes publicados para tu cuenta en este momento.
                </Text>
              ) : (
                plans.map((plan) => (
                  <View key={plan.id} style={[styles.planCard, { marginBottom: 10 }]}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planMeta}>{planProviders(plan)}</Text>
                    {plan.description ? (
                      <Text style={styles.planMeta}>{plan.description}</Text>
                    ) : null}
                    <Text style={styles.planMeta}>
                      {plan.analysisLimit} análisis · {plan.durationDays} días
                    </Text>
                    <Text style={styles.planPrice}>{formatPrice(plan.price)}</Text>
                    <Pressable
                      style={styles.contractBtn}
                      onPress={() => openContract(plan)}
                    >
                      <Text style={styles.contractBtnText}>Contratar</Text>
                    </Pressable>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}
