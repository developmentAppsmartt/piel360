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
import { Icons } from '../../../components/icons';
import { useBranding } from '../../../context/BrandingContext';
import { ApiError } from '../../../services/api.client';
import {
  doctorsService,
  type DoctorProfile,
} from '../../../services/doctors.service';
import { subscriptionsService } from '../../../services/subscriptions.service';
import type {
  Subscription,
  SubscriptionStatus,
} from '../../../types/subscription';
import { DoctorHeader } from '../patients/components/DoctorHeader';
import { createDoctorPatientsStyles } from '../patients/styles/patients.styles';
import { createPaymentsStyles } from './styles/payments.styles';

const SUPPORT_EMAIL = 'soporte@piel360.com';

type PaymentsBillingViewProps = {
  onBack: () => void;
  onOpenMenu: () => void;
  onOpenMessages?: () => void;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatPrice(price: string): string {
  const n = Number(price);
  if (Number.isNaN(n)) return price;
  return `$${n.toFixed(2)}`;
}

function statusLabel(status: SubscriptionStatus): string {
  if (status === 'active') return 'Pagada';
  if (status === 'cancelled') return 'Cancelada';
  return 'Pendiente';
}

type BillingForm = {
  firstName: string;
  lastName: string;
  docType: string;
  docNumber: string;
  address: string;
  city: string;
  country: string;
  zip: string;
};

function formFromDoctor(doctor: DoctorProfile): BillingForm {
  return {
    firstName: doctor.firstName ?? '',
    lastName: doctor.lastName ?? '',
    docType: doctor.docType ?? '',
    docNumber: doctor.docNumber ?? '',
    address: doctor.address ?? '',
    city: doctor.city ?? '',
    country: doctor.country ?? '',
    zip: doctor.zip ?? '',
  };
}

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
  const styles = useMemo(
    () => createPaymentsStyles(branding.colors),
    [branding.colors],
  );
  const [purchases, setPurchases] = useState<Subscription[]>([]);
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [form, setBilling] = useState<BillingForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [list, profile] = await Promise.all([
        subscriptionsService.listMine(),
        doctorsService.getMe(),
      ]);
      setPurchases(
        [...list].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      );
      setDoctor(profile);
      setBilling(formFromDoctor(profile));
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

  function setField<K extends keyof BillingForm>(key: K, value: string) {
    setBilling((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function saveBilling() {
    if (!form || saving) return;
    setSaving(true);
    try {
      const updated = await doctorsService.updateMe({
        ...(form.firstName.trim() ? { firstName: form.firstName.trim() } : {}),
        ...(form.lastName.trim() ? { lastName: form.lastName.trim() } : {}),
        docType: form.docType.trim(),
        docNumber: form.docNumber.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
        zip: form.zip.trim(),
      });
      setDoctor(updated);
      setBilling(formFromDoctor(updated));
      Alert.alert('Listo', 'Los datos de facturación se guardaron.');
    } catch (err) {
      Alert.alert(
        'No se pudo guardar',
        err instanceof ApiError
          ? err.message
          : 'Revisa los datos e inténtalo de nuevo.',
      );
    } finally {
      setSaving(false);
    }
  }

  const email = doctor?.user?.email ?? '';

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <DoctorHeader
        styles={headerStyles}
        showBack
        onBack={onBack}
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
            <AppIcon
              icon={Icons.back}
              size={22}
              color={branding.colors.textOnDark}
            />
          </Pressable>
          <Text style={styles.cardTitle}>Mis pagos</Text>
          <Pressable
            style={styles.moreBtn}
            onPress={() =>
              Alert.alert(
                'Soporte de facturación',
                `Si necesitas un comprobante o ayuda con un cobro, escribe a ${SUPPORT_EMAIL} e incluye la referencia de la compra.`,
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

        {loading || !form ? (
          <View style={styles.loading}>
            <ActivityIndicator color={branding.colors.primary} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
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
              <Text style={styles.sectionTitle}>Historial de compras</Text>
              <Text style={styles.sectionHint}>
                Planes contratados y referencia de pago. Los cobros se
                procesan con Wompi.
              </Text>
              {purchases.length === 0 ? (
                <Text style={styles.emptyText}>
                  Aún no hay compras registradas.
                </Text>
              ) : (
                purchases.map((item) => (
                  <View
                    key={item.id}
                    style={[styles.planCard, { marginBottom: 10 }]}
                  >
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {statusLabel(item.status)}
                      </Text>
                    </View>
                    <Text style={styles.planName}>{item.plan.name}</Text>
                    <Text style={styles.planMeta}>
                      {formatDate(item.createdAt)}
                      {item.endsAt ? ` · vence ${formatDate(item.endsAt)}` : ''}
                    </Text>
                    <Text style={styles.planPrice}>
                      {formatPrice(item.plan.price)}
                    </Text>
                    <Text style={styles.planMeta}>
                      Ref.{' '}
                      {item.wompiTransactionId?.trim() || 'sin referencia'}
                    </Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.block}>
              <Text style={styles.sectionTitle}>Datos de facturación</Text>
              <Text style={styles.sectionHint}>
                Nombre, documento y dirección que aparecen en tus compras.
              </Text>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Nombres</Text>
                <TextInput
                  style={styles.input}
                  value={form.firstName}
                  onChangeText={(value) => setField('firstName', value)}
                  placeholder="Nombres"
                  placeholderTextColor={branding.colors.muted}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Apellidos</Text>
                <TextInput
                  style={styles.input}
                  value={form.lastName}
                  onChangeText={(value) => setField('lastName', value)}
                  placeholder="Apellidos"
                  placeholderTextColor={branding.colors.muted}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Tipo de documento</Text>
                <TextInput
                  style={styles.input}
                  value={form.docType}
                  onChangeText={(value) => setField('docType', value)}
                  placeholder="CC, NIT, CE…"
                  autoCapitalize="characters"
                  placeholderTextColor={branding.colors.muted}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Número de documento</Text>
                <TextInput
                  style={styles.input}
                  value={form.docNumber}
                  onChangeText={(value) => setField('docNumber', value)}
                  placeholder="Documento"
                  placeholderTextColor={branding.colors.muted}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Correo</Text>
                <TextInput
                  style={[styles.input, { opacity: 0.7 }]}
                  value={email}
                  editable={false}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Dirección</Text>
                <TextInput
                  style={styles.input}
                  value={form.address}
                  onChangeText={(value) => setField('address', value)}
                  placeholder="Dirección de facturación"
                  placeholderTextColor={branding.colors.muted}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Ciudad</Text>
                <TextInput
                  style={styles.input}
                  value={form.city}
                  onChangeText={(value) => setField('city', value)}
                  placeholder="Ciudad"
                  placeholderTextColor={branding.colors.muted}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>País</Text>
                <TextInput
                  style={styles.input}
                  value={form.country}
                  onChangeText={(value) => setField('country', value)}
                  placeholder="País"
                  placeholderTextColor={branding.colors.muted}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Código postal</Text>
                <TextInput
                  style={styles.input}
                  value={form.zip}
                  onChangeText={(value) => setField('zip', value)}
                  placeholder="Código postal"
                  placeholderTextColor={branding.colors.muted}
                />
              </View>

              <Pressable
                style={[styles.contractBtn, saving ? { opacity: 0.6 } : null]}
                disabled={saving}
                onPress={() => void saveBilling()}
              >
                <Text style={styles.contractBtnText}>
                  {saving ? 'Guardando…' : 'Guardar datos'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}
