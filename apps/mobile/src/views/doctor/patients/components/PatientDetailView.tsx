import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AppIcon } from '../../../../components/AppIcon';
import { Icons } from '../../../../components/icons';
import { useBranding } from '../../../../context/BrandingContext';
import { ApiError } from '../../../../services/api.client';
import { patientsService } from '../../../../services/patients.service';
import type { PatientAnalysisSummary } from '../../../../types/analysis';
import type { PatientProfile } from '../../../../types/patient';
import {
  formatPatientDocument,
  patientDisplayName,
} from '../../../profile/data/patient';
import { DoctorHeader } from './DoctorHeader';
import { createDoctorPatientsStyles } from '../styles/patients.styles';
import { createPatientDetailStyles } from '../styles/patientDetail.styles';

function ageFromBirth(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return `${age} Años`;
}

function formatUpdate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function formatStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}${mm}${yyyy} ${hh}:${min}`;
}

function initials(p: PatientProfile): string {
  return [p.firstName, p.lastName]
    .map((x) => x?.[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
}

/** Heurística visual de riesgo hasta tener taxonomía formal. */
function severityColor(
  analysis: PatientAnalysisSummary,
  colors: { error: string; success: string; secondary: string },
): string {
  const label = (
    analysis.finalDiagnosis ??
    analysis.aiDiagnosis ??
    ''
  ).toLowerCase();
  if (
    label.includes('melanoma') ||
    label.includes('carcinoma') ||
    label.includes('bowen') ||
    label.includes('cáncer') ||
    label.includes('cancer')
  ) {
    return colors.error;
  }
  if (
    label.includes('nevo') ||
    label.includes('nevus') ||
    (analysis.aiProbability != null && analysis.aiProbability >= 0.5)
  ) {
    return '#EAB308';
  }
  return colors.success;
}

type PatientDetailViewProps = {
  patient: PatientProfile;
  onBack: () => void;
  onOpenMenu: () => void;
  onOpenMessages?: () => void;
};

export function PatientDetailView({
  patient,
  onBack,
  onOpenMenu,
  onOpenMessages,
}: PatientDetailViewProps) {
  const branding = useBranding();
  const headerStyles = useMemo(
    () => createDoctorPatientsStyles(branding.colors),
    [branding.colors],
  );
  const styles = useMemo(
    () => createPatientDetailStyles(branding.colors),
    [branding.colors],
  );

  const [analyses, setAnalyses] = useState<PatientAnalysisSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await patientsService.listAnalyses(patient.id);
        if (!cancelled) setAnalyses([...list].reverse());
      } catch (err) {
        if (!cancelled) {
          Alert.alert(
            'Historial',
            err instanceof ApiError
              ? err.message
              : 'No se pudo cargar el histórico de análisis.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patient.id]);

  const doc = formatPatientDocument(patient.docType, patient.docNumber);
  const name = patientDisplayName(patient);
  const primary = branding.colors.primary;
  const onDark = branding.colors.textOnDark;
  const muted = branding.colors.muted;

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
          <Pressable style={styles.roundBtn} onPress={onBack} accessibilityLabel="Volver">
            <AppIcon icon={Icons.back} size={22} color={muted} />
          </Pressable>
          <Text style={styles.cardTitle}>Datos del paciente</Text>
          <Pressable style={styles.roundBtn} onPress={onBack} accessibilityLabel="Cerrar">
            <AppIcon icon={Icons.close} size={18} color={muted} />
          </Pressable>
        </View>

        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(patient)}</Text>
          </View>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.meta}>
            Última actualización: {formatUpdate(patient.updatedAt)}
          </Text>
          <Text style={styles.meta}>
            ID: {patient.id}
            {doc ? `  ·  ${doc}` : ''}
          </Text>
          <Text style={styles.meta}>Edad: {ageFromBirth(patient.birthDate)}</Text>

          <Pressable
            style={styles.newAnalysisBtn}
            onPress={() =>
              Alert.alert(
                'Nuevo Análisis',
                'El flujo de análisis se conectará en una próxima iteración.',
              )
            }
          >
            <Text style={styles.newAnalysisText}>Nuevo Análisis</Text>
          </Pressable>
        </View>

        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>Histórico Análisis</Text>
          <View style={styles.historyActions}>
            <Pressable
              style={styles.historyAction}
              onPress={() =>
                Alert.alert('Asignar Cita', 'La agenda se conectará próximamente.')
              }
            >
              <AppIcon icon={Icons.calendarClock} size={16} color={primary} />
              <Text style={styles.historyActionText}>Asignar Cita</Text>
            </Pressable>
            <Pressable
              style={styles.historyAction}
              onPress={() =>
                Alert.alert(
                  'Solicitar Imagen',
                  'La solicitud de imagen se conectará próximamente.',
                )
              }
            >
              <AppIcon icon={Icons.image} size={16} color={primary} />
              <Text style={styles.historyActionText}>Solicitar Imagen</Text>
            </Pressable>
          </View>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={primary} />
          </View>
        ) : (
          <FlatList
            data={analyses}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>
                  Este paciente aún no tiene análisis registrados.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const diagnosis =
                item.finalDiagnosis?.trim() ||
                item.aiDiagnosis?.trim() ||
                'Sin diagnóstico';
              const thumb = item.coloredUrl || item.imageUrl;
              return (
                <Pressable
                  style={styles.analysisRow}
                  onPress={() =>
                    Alert.alert(
                      diagnosis,
                      'El detalle del análisis se abrirá en una próxima iteración.',
                    )
                  }
                >
                  <View style={styles.thumb}>
                    {thumb ? (
                      <Image source={{ uri: thumb }} style={styles.thumbImage} />
                    ) : (
                      <AppIcon icon={Icons.skin} size={22} color={primary} />
                    )}
                  </View>
                  <View style={styles.analysisBody}>
                    <View style={styles.diagnosisRow}>
                      <View
                        style={[
                          styles.severity,
                          {
                            backgroundColor: severityColor(item, branding.colors),
                          },
                        ]}
                      />
                      <Text style={styles.diagnosis} numberOfLines={1}>
                        {diagnosis}
                      </Text>
                    </View>
                    <View style={styles.stampRow}>
                      <AppIcon icon={Icons.calendarClock} size={13} color={primary} />
                      <Text style={styles.stamp}>{formatStamp(item.createdAt)}</Text>
                    </View>
                  </View>
                  <View style={styles.goBtn}>
                    <AppIcon icon={Icons.chevronRight} size={16} color={onDark} />
                  </View>
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </View>
  );
}
