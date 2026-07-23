import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AppIcon } from '../../../components/AppIcon';
import { Icons } from '../../../components/icons';
import { useBranding } from '../../../context/BrandingContext';
import { ApiError } from '../../../services/api.client';
import { subscriptionsService } from '../../../services/subscriptions.service';
import type {
  Subscription,
  SubscriptionStatus,
} from '../../../types/subscription';
import { DoctorHeader } from '../patients/components/DoctorHeader';
import { createDoctorPatientsStyles } from '../patients/styles/patients.styles';
import { createPaymentsStyles } from './styles/payments.styles';

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

function statusVisual(
  status: SubscriptionStatus,
  colors: { success: string; error: string },
): { bg: string; icon: typeof Icons.check | typeof Icons.document } {
  if (status === 'active') {
    return { bg: colors.success, icon: Icons.check };
  }
  if (status === 'cancelled') {
    return { bg: colors.error, icon: Icons.check };
  }
  return { bg: '#F59E0B', icon: Icons.document };
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

  const [items, setItems] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await subscriptionsService.listMine();
      setItems(list);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo cargar el historial de pagos.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onDark = branding.colors.textOnDark;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <DoctorHeader
        styles={headerStyles}
        messageCount={1}
        onOpenMenu={onOpenMenu}
        onOpenMessages={onOpenMessages}
      />

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Pressable
            style={styles.roundBtn}
            onPress={onBack}
            accessibilityLabel="Volver"
          >
            <AppIcon icon={Icons.back} size={22} color={onDark} />
          </Pressable>
          <Text style={styles.cardTitle}>Mis pagos</Text>
          <Pressable
            style={styles.moreBtn}
            onPress={() =>
              Alert.alert(
                'Opciones',
                'Más acciones de pagos se conectarán próximamente.',
              )
            }
            accessibilityLabel="Más opciones"
          >
            <AppIcon
              icon={Icons.moreVertical}
              size={22}
              color={branding.colors.muted}
            />
          </Pressable>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.headerCell, styles.colFecha]}>Fecha</Text>
          <Text style={[styles.headerCell, styles.colDesc]}>Descripcion</Text>
          <Text style={[styles.headerCell, styles.colPrecio]}>Precio</Text>
          <View style={styles.colEstado}>
            <Text style={styles.headerCell}>Estado</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={branding.colors.primary} />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
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
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>
                  {error ??
                    'Aún no tienes compras registradas.'}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const visual = statusVisual(item.status, branding.colors);
              return (
                <View style={styles.row}>
                  <Text style={[styles.cell, styles.colFecha]} numberOfLines={1}>
                    {formatDate(item.createdAt)}
                  </Text>
                  <Text style={[styles.cell, styles.colDesc]} numberOfLines={1}>
                    {item.plan.name}
                  </Text>
                  <Text
                    style={[styles.cell, styles.colPrecio]}
                    numberOfLines={1}
                  >
                    {formatPrice(item.plan.price)}
                  </Text>
                  <View style={styles.colEstado}>
                    <View
                      style={[styles.statusDot, { backgroundColor: visual.bg }]}
                      accessibilityLabel={item.status}
                    >
                      <AppIcon icon={visual.icon} size={14} color={onDark} />
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>
    </View>
  );
}
