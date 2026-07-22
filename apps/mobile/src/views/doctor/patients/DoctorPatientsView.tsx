import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../../context/AuthContext';
import { useBranding } from '../../../context/BrandingContext';
import { ApiError } from '../../../services/api.client';
import { patientsService } from '../../../services/patients.service';
import type { PatientProfile } from '../../../types/patient';
import { CreatePatientFlow } from '../create-patient/CreatePatientFlow';
import { PaymentsView } from '../payments/PaymentsView';
import { AccountDrawer } from './components/AccountDrawer';
import { DoctorHeader } from './components/DoctorHeader';
import { PatientDetailView } from './components/PatientDetailView';
import { PatientListRow } from './components/PatientListRow';
import { createDoctorPatientsStyles } from './styles/patients.styles';

type DoctorPatientsViewProps = {
  onOpenMessages?: () => void;
  onOpenProfile?: () => void;
  onCreatingChange?: (creating: boolean) => void;
};

export function DoctorPatientsView({
  onOpenMessages,
  onOpenProfile,
  onCreatingChange,
}: DoctorPatientsViewProps) {
  const { logout } = useAuth();
  const branding = useBranding();
  const styles = useMemo(
    () => createDoctorPatientsStyles(branding.colors),
    [branding.colors],
  );

  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showingPayments, setShowingPayments] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientProfile | null>(
    null,
  );

  const handleMenuSelect = (id: string) => {
    setMenuOpen(false);
    if (id === 'salir') void logout();
    else if (id === 'perfil') onOpenProfile?.();
    else if (id === 'suscripcion') setShowingPayments(true);
    else
      Alert.alert(
        'Próximamente',
        'Esta opción del menú se conectará en una siguiente iteración.',
      );
  };

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await patientsService.list();
      setPatients(list);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo cargar el listado de pacientes.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (showingPayments) {
    return (
      <>
        <PaymentsView
          onBack={() => setShowingPayments(false)}
          onOpenMenu={() => setMenuOpen(true)}
          onOpenMessages={onOpenMessages}
        />
        <AccountDrawer
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          onSelect={handleMenuSelect}
        />
      </>
    );
  }

  if (selectedPatient) {
    return (
      <>
        <PatientDetailView
          patient={selectedPatient}
          onBack={() => setSelectedPatient(null)}
          onOpenMenu={() => setMenuOpen(true)}
          onOpenMessages={onOpenMessages}
        />
        <AccountDrawer
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          onSelect={handleMenuSelect}
        />
      </>
    );
  }

  if (creating) {
    return (
      <>
        <CreatePatientFlow
          onClose={() => {
            setCreating(false);
            onCreatingChange?.(false);
            void load();
          }}
          onOpenMenu={() => setMenuOpen(true)}
          onCreated={() => void load()}
        />
        <AccountDrawer
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          onSelect={handleMenuSelect}
        />
      </>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <DoctorHeader
        styles={styles}
        title="Listado de Pacientes"
        messageCount={1}
        onOpenMenu={() => setMenuOpen(true)}
        onOpenMessages={onOpenMessages}
      />

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={branding.colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentPad}
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
          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Mis Pacientes</Text>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{patients.length}</Text>
              </View>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}># Análisis piel</Text>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>—</Text>
              </View>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}># Análisis Dist.</Text>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>—</Text>
              </View>
            </View>
          </View>

          <Pressable
            style={styles.newButton}
            onPress={() => {
              setCreating(true);
              onCreatingChange?.(true);
            }}
          >
            <Text style={styles.newButtonText}>Nuevo Paciente +</Text>
          </Pressable>

          <Text style={styles.listTitle}>Listado Pacientes</Text>

          {error ? (
            <Text style={{ color: branding.colors.error }}>{error}</Text>
          ) : null}

          {patients.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                Aún no tienes pacientes. Crea el primero con “Nuevo Paciente +”.
              </Text>
            </View>
          ) : (
            patients.map((p) => (
              <PatientListRow
                key={p.id}
                styles={styles}
                patient={p}
                onPress={() => setSelectedPatient(p)}
              />
            ))
          )}
        </ScrollView>
      )}

      <AccountDrawer
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSelect={handleMenuSelect}
      />
    </View>
  );
}
