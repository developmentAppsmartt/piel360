import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useAuth } from '../../../context/AuthContext';
import { useBranding } from '../../../context/BrandingContext';
import { ApiError } from '../../../services/api.client';
import { patientsService } from '../../../services/patients.service';
import type { PatientProfile } from '../../../types/patient';
import { FitzpatrickAnalysisFlow } from '../../analyses/fitzpatrick-flow/FitzpatrickAnalysisFlow';
import { SkiniverAnalysisFlow } from '../../analyses/skiniver-flow/SkiniverAnalysisFlow';
import { YoucamAnalysisFlow } from '../../analyses/youcam-flow/YoucamAnalysisFlow';
import { AnalysisDetailView } from '../analyses/AnalysisDetailView';
import { CreatePatientFlow } from '../create-patient/CreatePatientFlow';
import { PaymentsBillingView } from '../payments/PaymentsBillingView';
import { PaymentsView } from '../payments/PaymentsView';
import { DiagnosisLanguageView } from '../settings/DiagnosisLanguageView';
import type { AnalysisProviderSlug } from '../../../data/analysisProviderLabel';
import { SupportChatView } from '../../support/SupportChatView';
import { AboutPiel360Modal } from '../../../components/about/AboutPiel360';
import { LegalDocumentModal } from '../../../components/legal/LegalDocumentModal';
import type { LegalDocId } from '../../../data/legal/documents';
import { AccountDrawer } from './components/AccountDrawer';
import { DoctorHeader } from './components/DoctorHeader';
import { PatientDetailView } from './components/PatientDetailView';
import { PatientListRow } from './components/PatientListRow';
import { createDoctorPatientsStyles } from './styles/patients.styles';
import { patientDisplayName } from '../../profile/data/patient';

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function patientMatchesQuery(patient: PatientProfile, query: string): boolean {
  const q = normalizeSearch(query);
  if (!q) return true;

  const name = normalizeSearch(
    `${patient.firstName ?? ''} ${patient.lastName ?? ''}`,
  );
  const first = normalizeSearch(patient.firstName ?? '');
  const last = normalizeSearch(patient.lastName ?? '');
  const doc = normalizeSearch(patient.docNumber ?? '');
  const docType = normalizeSearch(patient.docType ?? '');
  const id = normalizeSearch(String(patient.id ?? ''));

  const created = new Date(patient.createdAt);
  const createdStamp = Number.isNaN(created.getTime())
    ? ''
    : normalizeSearch(
        `${String(created.getDate()).padStart(2, '0')}/${String(created.getMonth() + 1).padStart(2, '0')}/${created.getFullYear()}`,
      );

  return (
    name.includes(q) ||
    first.includes(q) ||
    last.includes(q) ||
    doc.includes(q) ||
    `${docType} ${doc}`.includes(q) ||
    id.includes(q) ||
    createdStamp.includes(q)
  );
}

type DoctorPatientsViewProps = {
  onOpenMessages?: () => void;
  onOpenProfile?: () => void;
  onOpenAgenda?: () => void;
  onCreatingChange?: (creating: boolean) => void;
};

export function DoctorPatientsView({
  onOpenMessages,
  onOpenProfile,
  onOpenAgenda,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showingPayments, setShowingPayments] = useState(false);
  const [showingLanguage, setShowingLanguage] = useState(false);
  const [showingBilling, setShowingBilling] = useState(false);
  const [showingSupport, setShowingSupport] = useState(false);
  const [showingAbout, setShowingAbout] = useState(false);
  const [legalDoc, setLegalDoc] = useState<LegalDocId | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<PatientProfile | null>(
    null,
  );
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(
    null,
  );
  const [activeProvider, setActiveProvider] =
    useState<AnalysisProviderSlug | null>(null);

  const handleMenuSelect = (id: string) => {
    setMenuOpen(false);
    if (id === 'salir') void logout();
    else if (id === 'perfil' || id === 'config') onOpenProfile?.();
    else if (id === 'suscripcion') {
      setShowingLanguage(false);
      setShowingBilling(false);
      setShowingPayments(true);
    } else if (id === 'idioma') {
      setShowingPayments(false);
      setShowingBilling(false);
      setShowingLanguage(true);
    }     else if (id === 'pagos') {
      setShowingPayments(false);
      setShowingLanguage(false);
      setShowingBilling(true);
    } else if (id === 'soporte') {
      setShowingPayments(false);
      setShowingLanguage(false);
      setShowingBilling(false);
      setShowingSupport(true);
    } else if (id === 'acuerdo') {
      setLegalDoc('terms-professional');
    } else if (id === 'acerca') {
      setShowingAbout(true);
    } else
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

  const filteredPatients = useMemo(
    () => patients.filter((p) => patientMatchesQuery(p, searchQuery)),
    [patients, searchQuery],
  );

  useEffect(() => {
    void load();
  }, [load]);

  if (showingSupport) {
    return <SupportChatView onClose={() => setShowingSupport(false)} />;
  }

  if (showingLanguage) {
    return (
      <>
        <DiagnosisLanguageView
          onBack={() => setShowingLanguage(false)}
          onOpenMenu={() => setMenuOpen(true)}
          onOpenMessages={onOpenMessages}
        />
        <AccountDrawer
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          onSelect={handleMenuSelect}
        />
        <LegalDocumentModal
          docId={legalDoc}
          visible={legalDoc != null}
          onClose={() => setLegalDoc(null)}
        />
      </>
    );
  }

  if (showingBilling) {
    return (
      <>
        <PaymentsBillingView
          onBack={() => setShowingBilling(false)}
          onOpenMenu={() => setMenuOpen(true)}
          onOpenMessages={onOpenMessages}
        />
        <AccountDrawer
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          onSelect={handleMenuSelect}
        />
        <LegalDocumentModal
          docId={legalDoc}
          visible={legalDoc != null}
          onClose={() => setLegalDoc(null)}
        />
      </>
    );
  }

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
        <LegalDocumentModal
          docId={legalDoc}
          visible={legalDoc != null}
          onClose={() => setLegalDoc(null)}
        />
      </>
    );
  }

  if (selectedPatient && activeProvider === 'youcam') {
    // YouCam: Camera Kit nativo → POST /youcam/analyses
    return (
      <>
        <YoucamAnalysisFlow
          patientId={selectedPatient.id}
          patientName={patientDisplayName(selectedPatient)}
          onClose={() => setActiveProvider(null)}
          onAnalysisCreated={(analysisId) => {
            setActiveProvider(null);
            setSelectedAnalysisId(analysisId);
          }}
          onOpenMenu={() => setMenuOpen(true)}
          onOpenMessages={onOpenMessages}
        />
        <AccountDrawer
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          onSelect={handleMenuSelect}
        />
        <LegalDocumentModal
          docId={legalDoc}
          visible={legalDoc != null}
          onClose={() => setLegalDoc(null)}
        />
      </>
    );
  }

  if (selectedPatient && activeProvider === 'skiniver') {
    return (
      <>
        <SkiniverAnalysisFlow
          patientId={selectedPatient.id}
          patientName={patientDisplayName(selectedPatient)}
          patientGender={selectedPatient.gender}
          onClose={() => setActiveProvider(null)}
          onAnalysisCreated={(analysisId) => {
            setActiveProvider(null);
            setSelectedAnalysisId(analysisId);
          }}
          onOpenMenu={() => setMenuOpen(true)}
          onOpenMessages={onOpenMessages}
        />
        <AccountDrawer
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          onSelect={handleMenuSelect}
        />
        <LegalDocumentModal
          docId={legalDoc}
          visible={legalDoc != null}
          onClose={() => setLegalDoc(null)}
        />
      </>
    );
  }

  if (selectedPatient && activeProvider === 'fitzpatrick') {
    return (
      <>
        <FitzpatrickAnalysisFlow
          patientId={selectedPatient.id}
          patientName={patientDisplayName(selectedPatient)}
          onClose={() => setActiveProvider(null)}
          onAnalysisCreated={(analysisId) => {
            setActiveProvider(null);
            setSelectedAnalysisId(analysisId);
          }}
          onOpenMenu={() => setMenuOpen(true)}
          onOpenMessages={onOpenMessages}
        />
        <AccountDrawer
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          onSelect={handleMenuSelect}
        />
        <LegalDocumentModal
          docId={legalDoc}
          visible={legalDoc != null}
          onClose={() => setLegalDoc(null)}
        />
      </>
    );
  }

  if (selectedPatient && selectedAnalysisId) {
    return (
      <>
        <AnalysisDetailView
          analysisId={selectedAnalysisId}
          patientName={patientDisplayName(selectedPatient)}
          patientGender={selectedPatient.gender}
          onBack={() => setSelectedAnalysisId(null)}
          onOpenMenu={() => setMenuOpen(true)}
          onOpenMessages={onOpenMessages}
        />
        <AccountDrawer
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          onSelect={handleMenuSelect}
        />
        <LegalDocumentModal
          docId={legalDoc}
          visible={legalDoc != null}
          onClose={() => setLegalDoc(null)}
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
          onOpenAgenda={onOpenAgenda}
          onOpenAnalysis={(id) => setSelectedAnalysisId(id)}
          onStartAnalysis={(provider) => setActiveProvider(provider)}
          onPatientUpdated={(updated) => {
            setSelectedPatient(updated);
            setPatients((prev) =>
              prev.map((p) => (p.id === updated.id ? updated : p)),
            );
          }}
        />
        <AccountDrawer
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          onSelect={handleMenuSelect}
        />
        <LegalDocumentModal
          docId={legalDoc}
          visible={legalDoc != null}
          onClose={() => setLegalDoc(null)}
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
        <LegalDocumentModal
          docId={legalDoc}
          visible={legalDoc != null}
          onClose={() => setLegalDoc(null)}
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
        onOpenGift={() =>
          Alert.alert(
            'Premios',
            'Aquí verás recompensas y beneficios de Piel 360. Este módulo se activará en una próxima versión.',
          )
        }
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
          <View style={styles.searchWrap}>
            <AppIcon
              icon={Icons.search}
              size={20}
              color={branding.colors.primary}
            />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Buscar paciente por cédula, nombre o fecha"
              placeholderTextColor="#9CA3AF"
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
              returnKeyType="search"
            />
            <AppIcon
              icon={Icons.settings}
              size={20}
              color={branding.colors.muted}
            />
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
          ) : filteredPatients.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                No hay pacientes que coincidan con “{searchQuery.trim()}”.
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {filteredPatients.map((p) => (
                <PatientListRow
                  key={p.id}
                  styles={styles}
                  patient={p}
                  onPress={() => setSelectedPatient(p)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <AccountDrawer
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSelect={handleMenuSelect}
      />
      <LegalDocumentModal
        docId={legalDoc}
        visible={legalDoc != null}
        onClose={() => setLegalDoc(null)}
      />
      <AboutPiel360Modal
        visible={showingAbout}
        onClose={() => setShowingAbout(false)}
      />
    </View>
  );
}
