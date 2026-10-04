import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppIcon } from '../../../../components/AppIcon';
import { Icons } from '../../../../components/icons';
import { analysesService } from '../../../../services/analyses.service';
import type { PatientAnalysisSummary } from '../../../../types/analysis';
import { skiniverDiagnosisLabel } from '../../../../types/skiniver-labels';

const MAX_ROWS = 20;

function patientName(row: PatientAnalysisSummary): string {
  return `${row.patient?.firstName ?? ''} ${row.patient?.lastName ?? ''}`.trim();
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('es-CO');
}

/**
 * "Clínico: análisis imágenes dermatológica" (paridad CRM
 * SkiniverClinicoWidget): buscador por paciente sobre los análisis
 * dermatológicos válidos. El detalle se abre en la vista de análisis que ya
 * tiene la app, en vez de duplicar imágenes y resultados aquí.
 */
export function SkiniverClinicalBrowser({
  primary,
  onOpen,
}: {
  primary: string;
  onOpen: (analysisId: string, patientName: string) => void;
}) {
  const [rows, setRows] = useState<PatientAnalysisSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let alive = true;
    analysesService
      .list()
      .then((data) => {
        if (alive) setRows(data);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const visible = useMemo(() => {
    const skiniver = (rows ?? []).filter(
      (a) => a.isValid !== false && !a.youcamTaskId && !a.fitzpatrickTaskId,
    );
    const q = search.trim().toLowerCase();
    const filtered = q
      ? skiniver.filter((a) => patientName(a).toLowerCase().includes(q))
      : skiniver;
    return filtered.slice(0, MAX_ROWS);
  }, [rows, search]);

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.searchBox}>
        <AppIcon icon={Icons.search} size={16} color="#9CA3AF" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar paciente..."
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
          autoCorrect={false}
        />
      </View>

      {rows == null && !failed ? (
        <ActivityIndicator color={primary} style={{ paddingVertical: 12 }} />
      ) : null}
      {failed ? (
        <Text style={styles.empty}>No se pudieron cargar los análisis.</Text>
      ) : null}

      {rows != null ? (
        <View style={styles.list}>
          {visible.length === 0 ? (
            <Text style={styles.emptyRow}>
              Sin análisis dermatológicos {search ? 'que coincidan' : 'aún'}.
            </Text>
          ) : (
            visible.map((a, index) => {
              const name = patientName(a);
              return (
                <Pressable
                  key={a.id}
                  onPress={() => onOpen(a.id, name)}
                  style={({ pressed }) => [
                    styles.row,
                    index < visible.length - 1 && styles.rowDivider,
                    pressed && styles.rowPressed,
                  ]}
                >
                  <Text style={styles.rowName} numberOfLines={1}>
                    {name || 'Paciente'}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {formatDate(a.createdAt)}
                    {a.aiDiagnosis
                      ? ` · ${skiniverDiagnosisLabel(a.aiDiagnosis)}`
                      : ''}
                  </Text>
                </Pressable>
              );
            })
          )}
        </View>
      ) : null}

      <Text style={styles.empty}>
        Elige un análisis de la lista para ver la imagen y los resultados de IA.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  list: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  rowPressed: { backgroundColor: '#F3F4F6' },
  rowName: { flexShrink: 1, fontSize: 13, color: '#111827', fontWeight: '500' },
  rowMeta: { flexShrink: 1, fontSize: 11, color: '#6B7280', textAlign: 'right' },
  emptyRow: { fontSize: 13, color: '#6B7280', padding: 10 },
  empty: {
    textAlign: 'center',
    fontSize: 13,
    color: '#6B7280',
    paddingVertical: 8,
  },
});
