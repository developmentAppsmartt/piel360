import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AppIcon } from '../../../components/AppIcon';
import { Icons } from '../../../components/icons';
import { useAuth } from '../../../context/AuthContext';
import { useBranding } from '../../../context/BrandingContext';
import { ApiError } from '../../../services/api.client';
import { analysesService } from '../../../services/analyses.service';
import type {
  AnalysisDetail,
  YoucamRawResponse,
} from '../../../types/analysis';
import { DoctorHeader } from '../patients/components/DoctorHeader';
import { createDoctorPatientsStyles } from '../patients/styles/patients.styles';
import { SkiniverResultsSection } from './components/SkiniverResultsSection';
import { YoucamResultsSection } from './components/YoucamResultsSection';
import { createAnalysisDetailStyles } from './styles/analysisDetail.styles';
import { YoucamProgressView } from './YoucamProgressView';
import { YoucamReportView } from './YoucamReportView';

type AnalysisDetailViewProps = {
  analysisId: string;
  patientName?: string;
  /** Si false, oculta el botón compartir (vista paciente). */
  canShare?: boolean;
  onBack: () => void;
  onOpenMenu: () => void;
  onOpenMessages?: () => void;
};

type SubView = 'detail' | 'progress' | 'report';

function formatStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} · ${hh}:${min}`;
}

export function AnalysisDetailView({
  analysisId,
  patientName,
  canShare,
  onBack,
  onOpenMenu,
  onOpenMessages,
}: AnalysisDetailViewProps) {
  const { user } = useAuth();
  const branding = useBranding();
  const headerStyles = useMemo(
    () => createDoctorPatientsStyles(branding.colors),
    [branding.colors],
  );
  const styles = useMemo(
    () => createAnalysisDetailStyles(branding.colors),
    [branding.colors],
  );

  const showShare =
    canShare ??
    (user?.role === 'doctor' ||
      user?.role === 'superadmin' ||
      user?.empresa === true);

  const [analysis, setAnalysis] = useState<AnalysisDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subView, setSubView] = useState<SubView>('detail');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const detail = await analysesService.getById(analysisId);
        if (!cancelled) setAnalysis(detail);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : 'No se pudo cargar el análisis.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [analysisId]);

  const isYoucam = !!analysis?.youcamTaskId;
  const raw = (analysis?.aiRawResponse ?? null) as YoucamRawResponse | null;
  const youcamError =
    isYoucam && raw && raw.error === true
      ? raw.message ?? 'Error al procesar el análisis'
      : null;

  const displayName =
    patientName ??
    (analysis?.patient
      ? `${analysis.patient.firstName} ${analysis.patient.lastName}`.trim()
      : 'Paciente');

  async function handleShare() {
    if (!analysis || analysis.sharedWithPatient || sharing) return;
    setSharing(true);
    try {
      const updated = await analysesService.shareWithPatient(analysis.id);
      setAnalysis(updated);
      Alert.alert(
        'Análisis compartido',
        'El paciente ya puede verlo en el histórico de su inicio.',
      );
    } catch (err) {
      Alert.alert(
        'No se pudo compartir',
        err instanceof ApiError
          ? err.message
          : 'Inténtalo de nuevo en unos segundos.',
      );
    } finally {
      setSharing(false);
    }
  }

  if (analysis && isYoucam && analysis.isValid && subView === 'progress') {
    return (
      <YoucamProgressView
        analysis={analysis}
        onBack={() => setSubView('detail')}
        onOpenMenu={onOpenMenu}
        onOpenMessages={onOpenMessages}
      />
    );
  }

  if (analysis && isYoucam && analysis.isValid && subView === 'report') {
    return (
      <YoucamReportView
        analysis={analysis}
        patientName={displayName}
        canShare={showShare}
        onShared={setAnalysis}
        onBack={() => setSubView('detail')}
        onOpenMenu={onOpenMenu}
        onOpenMessages={onOpenMessages}
      />
    );
  }

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
            <AppIcon
              icon={Icons.back}
              size={22}
              color={branding.colors.muted}
            />
          </Pressable>
          <Text style={styles.cardTitle}>Resultado del análisis</Text>
          <Pressable
            style={styles.roundBtn}
            onPress={onBack}
            accessibilityLabel="Cerrar"
          >
            <AppIcon
              icon={Icons.close}
              size={18}
              color={branding.colors.muted}
            />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={branding.colors.primary} />
            <Text style={styles.loadingText}>Cargando resultados…</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : analysis ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.patientName}>{displayName}</Text>
            <Text style={styles.stamp}>{formatStamp(analysis.createdAt)}</Text>

            {showShare ? (
              <Pressable
                style={[
                  styles.shareBtn,
                  analysis.sharedWithPatient && styles.shareBtnShared,
                  (sharing || analysis.sharedWithPatient) &&
                    !analysis.sharedWithPatient &&
                    styles.shareBtnDisabled,
                ]}
                onPress={handleShare}
                disabled={sharing || !!analysis.sharedWithPatient}
              >
                {sharing ? (
                  <ActivityIndicator color={branding.colors.textOnDark} />
                ) : (
                  <>
                    <AppIcon
                      icon={
                        analysis.sharedWithPatient ? Icons.check : Icons.share
                      }
                      size={18}
                      color={
                        analysis.sharedWithPatient
                          ? branding.colors.success
                          : branding.colors.textOnDark
                      }
                    />
                    <Text
                      style={[
                        styles.shareBtnText,
                        analysis.sharedWithPatient &&
                          styles.shareBtnTextShared,
                      ]}
                    >
                      {analysis.sharedWithPatient
                        ? 'Compartido con el paciente'
                        : 'Compartir análisis'}
                    </Text>
                  </>
                )}
              </Pressable>
            ) : null}

            {youcamError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>
                  El análisis no se pudo procesar: {youcamError}
                </Text>
              </View>
            ) : null}

            {isYoucam && !analysis.isValid && !youcamError ? (
              <Text style={styles.note}>
                Procesando el análisis facial… Puedes volver más tarde.
              </Text>
            ) : null}

            {isYoucam && analysis.isValid ? (
              <YoucamResultsSection
                analysis={analysis}
                onOpenProgress={() => setSubView('progress')}
                onOpenReport={() => setSubView('report')}
              />
            ) : null}

            {!isYoucam ? <SkiniverResultsSection analysis={analysis} /> : null}
          </ScrollView>
        ) : null}
      </View>
    </View>
  );
}
