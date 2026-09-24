import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { CalendarDateField } from '../../components/CalendarDateField';
import { Icons } from '../../components/icons';
import { useBranding } from '../../context/BrandingContext';
import { ApiError } from '../../services/api.client';
import {
  agendaService,
  type AgendaAppointment,
  type AgendaOverview,
} from '../../services/agenda.service';
import { notificationsService } from '../../services/notifications.service';
import { patientsService } from '../../services/patients.service';
import type { PatientProfile } from '../../types/patient';
import {
  formatPatientDocument,
  patientDisplayName,
} from '../../types/patient';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import { AppModuleChrome } from '../shared/AppModuleChrome';
import { createAgendaStyles } from './styles/agenda.styles';
import {
  AgendaMonthCalendar,
  SLOT_MINUTES,
  availableStartTimes,
  dayOfWeekFromYmd,
  localDateTimeIso,
  minutesToTime,
  monthBoundsLocal,
} from './AgendaMonthCalendar';

const STATUS_LABEL: Record<string, string> = {
  proposed: 'Pendiente',
  requested: 'Pendiente (solicitud)',
  confirmed: 'Confirmada',
  declined: 'Rechazada',
  cancelled: 'Cancelada',
  completed: 'Completada',
};

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function dayKey(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

/** Fecha/hora local de la cita (misma zona que al elegir día y hora). */
function formatApptRange(startsAt: string, endsAt: string): string {
  const start = formatStamp(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(end.getTime())) return start;
  const hh = String(end.getHours()).padStart(2, '0');
  const min = String(end.getMinutes()).padStart(2, '0');
  return `${start} – ${hh}:${min}`;
}

/** Acepta dd/mm/yyyy, dd-mm-yyyy o yyyy-mm-dd. */
function parseFlexibleDate(raw: string): Date | null {
  const t = raw.trim();
  if (!t) return null;
  const m = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    const d = new Date(year, month - 1, day);
    if (
      d.getFullYear() === year &&
      d.getMonth() === month - 1 &&
      d.getDate() === day
    ) {
      return d;
    }
    return null;
  }
  const iso = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    const d = new Date(year, month - 1, day);
    if (
      d.getFullYear() === year &&
      d.getMonth() === month - 1 &&
      d.getDate() === day
    ) {
      return d;
    }
  }
  return null;
}

function matchesAppointmentDateQuery(iso: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const stamp = formatStamp(iso).toLowerCase();
  const locale = new Date(iso).toLocaleString().toLowerCase();
  const key = dayKey(iso);
  if (
    stamp.includes(q) ||
    locale.includes(q) ||
    (key && key.includes(q))
  ) {
    return true;
  }

  const rangeParts = q.split(/\s+(?:–|-|a|al)\s+/i).filter(Boolean);
  if (rangeParts.length === 2) {
    const from = parseFlexibleDate(rangeParts[0]);
    const to = parseFlexibleDate(rangeParts[1]);
    const item = new Date(iso);
    if (from && to && !Number.isNaN(item.getTime())) {
      const start = new Date(from);
      start.setHours(0, 0, 0, 0);
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      return item >= start && item <= end;
    }
  }

  const single = parseFlexibleDate(q);
  if (single && key) {
    const yyyy = single.getFullYear();
    const mm = String(single.getMonth() + 1).padStart(2, '0');
    const dd = String(single.getDate()).padStart(2, '0');
    return key === `${yyyy}-${mm}-${dd}`;
  }

  return false;
}

function patientMatchesQuery(patient: PatientProfile, query: string): boolean {
  const q = normalizeSearch(query);
  if (!q) return false;
  const name = normalizeSearch(patientDisplayName(patient));
  const doc = normalizeSearch(patient.docNumber ?? '');
  const docType = normalizeSearch(patient.docType ?? '');
  const email = normalizeSearch(patient.email ?? '');
  return (
    name.includes(q) ||
    doc.includes(q) ||
    `${docType} ${doc}`.includes(q) ||
    email.includes(q)
  );
}

function PatientAvatar({
  patient,
  styles,
  iconColor,
}: {
  patient: PatientProfile;
  styles: ReturnType<typeof createAgendaStyles>;
  iconColor: string;
}) {
  const uri = resolveMediaUrl(patient.avatarUrl);
  return (
    <View style={styles.searchAvatar}>
      {uri ? (
        <Image
          source={{ uri }}
          style={styles.searchAvatarImage}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <AppIcon icon={Icons.account} size={18} color={iconColor} />
      )}
    </View>
  );
}

type DoctorAgendaViewProps = {
  onOpenMessages?: () => void;
  onOpenProfile?: () => void;
};

export function DoctorAgendaView({
  onOpenMessages,
  onOpenProfile,
}: DoctorAgendaViewProps) {
  const branding = useBranding();
  const styles = useMemo(
    () => createAgendaStyles(branding.colors),
    [branding.colors],
  );
  const primary = branding.colors.primary;

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<AgendaOverview | null>(null);
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [anchor, setAnchor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [patientId, setPatientId] = useState('');
  const [patientQuery, setPatientQuery] = useState('');
  const [hoursOpen, setHoursOpen] = useState(false);
  const [appointmentTime, setAppointmentTime] = useState('');
  const [title, setTitle] = useState('Consulta');
  const [openApptId, setOpenApptId] = useState<string | null>(null);
  const [searchFrom, setSearchFrom] = useState<string | null>(null);
  const [searchTo, setSearchTo] = useState<string | null>(null);

  const { from, to } = useMemo(() => monthBoundsLocal(anchor), [anchor]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, pts] = await Promise.all([
        agendaService.getOverview(from, to),
        patientsService.list().catch(() => []),
      ]);
      setOverview(ov);
      setPatients(pts as PatientProfile[]);
    } catch {
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const blockedByDate = useMemo(() => {
    const map = new Map<string, { id: string; reason: string | null }>();
    for (const b of overview?.blockedDays ?? []) {
      map.set(b.date, { id: b.id, reason: b.reason });
    }
    return map;
  }, [overview?.blockedDays]);

  const apptCountByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of overview?.appointments ?? []) {
      const key = dayKey(a.startsAt);
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [overview?.appointments]);

  const hourOptions = useMemo(() => {
    if (!selectedDate || blockedByDate.has(selectedDate)) return [];
    return availableStartTimes(
      selectedDate,
      overview?.weeklySlots ?? [],
      overview?.appointments ?? [],
    );
  }, [
    selectedDate,
    blockedByDate,
    overview?.weeklySlots,
    overview?.appointments,
  ]);

  useEffect(() => {
    if (appointmentTime && !hourOptions.includes(appointmentTime)) {
      setAppointmentTime('');
    }
  }, [hourOptions, appointmentTime]);

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === patientId) ?? null,
    [patients, patientId],
  );

  const filteredAppointments = useMemo(() => {
    const list = overview?.appointments ?? [];
    if (!searchFrom) return list;
    const query =
      searchTo && searchTo !== searchFrom
        ? `${searchFrom} a ${searchTo}`
        : searchFrom;
    return list.filter((a) =>
      matchesAppointmentDateQuery(a.startsAt, query),
    );
  }, [overview?.appointments, searchFrom, searchTo]);

  const patientResults = useMemo(() => {
    const q = patientQuery.trim();
    if (q.length < 2) return [];
    return patients.filter((p) => patientMatchesQuery(p, q)).slice(0, 8);
  }, [patients, patientQuery]);

  function selectPatient(patient: PatientProfile) {
    setPatientId(patient.id);
    setPatientQuery(patientDisplayName(patient));
  }

  function clearPatient() {
    setPatientId('');
    setPatientQuery('');
  }

  async function toggleBlock() {
    if (!selectedDate) return;
    const existing = blockedByDate.get(selectedDate);
    try {
      if (existing) {
        await agendaService.deleteBlockedDay(existing.id);
        setBlockReason('');
      } else {
        const reason = blockReason.trim();
        if (!reason) {
          Alert.alert(
            'Motivo',
            'Indica un motivo para marcar el día como no disponible.',
          );
          return;
        }
        await agendaService.createBlockedDay(selectedDate, reason);
        setBlockReason('');
      }
      await load();
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof ApiError ? err.message : 'No se pudo actualizar el día',
      );
    }
  }

  async function propose() {
    if (!patientId || !selectedDate || !appointmentTime) {
      Alert.alert(
        'Faltan datos',
        'Selecciona paciente, día en el calendario y hora.',
      );
      return;
    }
    if (blockedByDate.has(selectedDate)) {
      Alert.alert('No disponible', 'Ese día está bloqueado.');
      return;
    }
    try {
      const startsAt = localDateTimeIso(selectedDate, appointmentTime);
      const [hh, mm] = appointmentTime.split(':').map(Number);
      const endsAt = localDateTimeIso(
        selectedDate,
        minutesToTime(hh * 60 + mm + SLOT_MINUTES),
      );
      await agendaService.proposeAppointment({
        patientId,
        startsAt,
        endsAt,
        title: title.trim() || 'Cita',
      });
      setAppointmentTime('');
      setPatientId('');
      setPatientQuery('');
      setHoursOpen(false);
      await load();
      Alert.alert('Listo', 'La propuesta llegó a la agenda del paciente.');
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof ApiError ? err.message : 'No se pudo crear la cita',
      );
    }
  }

  async function updateAppt(
    id: string,
    status: 'confirmed' | 'declined' | 'cancelled' | 'completed',
  ) {
    try {
      await agendaService.updateDoctorAppointment(id, status);
      await notificationsService.markAppointmentRead(id);
      await load();
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof ApiError ? err.message : 'No se pudo actualizar',
      );
    }
  }

  const selectedBlocked = selectedDate
    ? blockedByDate.get(selectedDate)
    : undefined;

  return (
    <View style={styles.screen}>
      <AppModuleChrome
        onOpenMessages={onOpenMessages}
        onOpenProfile={onOpenProfile}
      >
        {loading && !overview ? (
          <View style={styles.centered}>
            <ActivityIndicator color={primary} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Calendario</Text>
              <Text style={styles.sectionSubtitle}>
                Toca un día disponible para asignar una cita.
              </Text>
              <AgendaMonthCalendar
                anchor={anchor}
                onPrevMonth={() =>
                  setAnchor(
                    new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1),
                  )
                }
                onNextMonth={() =>
                  setAnchor(
                    new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1),
                  )
                }
                selectedDate={selectedDate}
                onSelectDate={(date) => {
                  setSelectedDate(date);
                  setAppointmentTime('');
                  const blocked = blockedByDate.get(date);
                  setBlockReason(blocked?.reason ?? '');
                }}
                blockedByDate={blockedByDate}
                apptCountByDate={apptCountByDate}
                primaryColor={primary}
                textColor={branding.colors.text}
              />

              {selectedDate ? (
                <View
                  style={[
                    styles.dayPanel,
                    selectedBlocked ? styles.dayPanelBlocked : null,
                  ]}
                >
                  <Text style={styles.dayPanelTitle}>
                    Día {selectedDate} ·{' '}
                    {DAY_LABELS[dayOfWeekFromYmd(selectedDate)]}
                  </Text>
                  <TextInput
                    value={blockReason}
                    onChangeText={setBlockReason}
                    editable={!selectedBlocked}
                    placeholder="Motivo (días no disponibles)"
                    placeholderTextColor="#9CA3AF"
                    style={styles.input}
                  />
                  {selectedBlocked?.reason ? (
                    <Text style={styles.errorText}>
                      Motivo: {selectedBlocked.reason}
                    </Text>
                  ) : null}
                  <Pressable
                    onPress={() => void toggleBlock()}
                    style={
                      selectedBlocked ? styles.primaryBtn : styles.dangerBtn
                    }
                  >
                    <Text style={styles.btnText}>
                      {selectedBlocked
                        ? 'Marcar como disponible'
                        : 'Marcar como no disponible'}
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {(overview?.weeklySlots.length ?? 0) > 0 ? (
                <View style={{ marginTop: 12, gap: 6 }}>
                  <Text style={styles.dayPanelTitle}>Horarios de atención</Text>
                  <View style={styles.weeklySlotsGrid}>
                    {overview!.weeklySlots.map((s) => (
                      <View key={s.id} style={styles.weeklySlotItem}>
                        <Text style={styles.weeklySlotText}>
                          {DAY_LABELS[s.dayOfWeek]} · {s.startTime}–{s.endTime}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <Text style={styles.sectionSubtitle}>
                  Sin horarios guardados: se ofrecen horas de 09:00 a 18:00.
                  Configúralos en el CRM para personalizarlos.
                </Text>
              )}
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Asignar cita</Text>

              <View style={styles.stepBlock}>
                <View style={styles.stepHeader}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>1</Text>
                  </View>
                  <Text style={styles.stepLabel}>Buscar paciente</Text>
                </View>
                <View style={styles.searchBar}>
                  <AppIcon
                    icon={Icons.search}
                    size={18}
                    color={branding.colors.muted}
                  />
                  <TextInput
                    value={patientQuery}
                    onChangeText={setPatientQuery}
                    placeholder="Nombre, cédula o correo"
                    placeholderTextColor="#9CA3AF"
                    style={styles.searchInput}
                    autoCorrect={false}
                    autoCapitalize="words"
                  />
                  {patientQuery.length > 0 ? (
                    <Pressable
                      onPress={() => setPatientQuery('')}
                      hitSlop={8}
                    >
                      <AppIcon
                        icon={Icons.close}
                        size={18}
                        color={branding.colors.muted}
                      />
                    </Pressable>
                  ) : null}
                </View>
                {patientQuery.trim().length >= 2 ? (
                  <View style={styles.searchResults}>
                    {patientResults.length === 0 ? (
                      <Text style={styles.searchEmpty}>
                        No se encontraron pacientes
                      </Text>
                    ) : (
                      <ScrollView
                        nestedScrollEnabled
                        keyboardShouldPersistTaps="handled"
                      >
                        {patientResults.map((p) => {
                          const doc = formatPatientDocument(
                            p.docType,
                            p.docNumber,
                          );
                          const active = patientId === p.id;
                          return (
                            <Pressable
                              key={p.id}
                              onPress={() => selectPatient(p)}
                              style={[
                                styles.searchResultRow,
                                active && styles.searchResultRowActive,
                              ]}
                            >
                              <PatientAvatar
                                patient={p}
                                styles={styles}
                                iconColor={primary}
                              />
                              <View style={styles.searchResultBody}>
                                <Text
                                  style={styles.searchResultName}
                                  numberOfLines={1}
                                >
                                  {patientDisplayName(p)}
                                </Text>
                                <Text style={styles.searchResultDoc}>
                                  Cédula: {doc ?? '—'}
                                </Text>
                              </View>
                              {active ? (
                                <AppIcon
                                  icon={Icons.check}
                                  size={18}
                                  color={primary}
                                />
                              ) : null}
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    )}
                  </View>
                ) : !selectedPatient ? (
                  <Text style={styles.mutedText}>
                    Escribe al menos 2 caracteres para buscar.
                  </Text>
                ) : null}
              </View>

              <View style={styles.stepBlock}>
                <View style={styles.stepHeader}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>2</Text>
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      !selectedPatient && styles.stepLabelMuted,
                    ]}
                  >
                    Paciente seleccionado
                  </Text>
                </View>
                {selectedPatient ? (
                  <View style={styles.selectedChip}>
                    <PatientAvatar
                      patient={selectedPatient}
                      styles={styles}
                      iconColor={primary}
                    />
                    <View style={styles.selectedChipBody}>
                      <Text style={styles.selectedChipName} numberOfLines={1}>
                        {patientDisplayName(selectedPatient)}
                      </Text>
                      <Text style={styles.selectedChipDoc}>
                        {formatPatientDocument(
                          selectedPatient.docType,
                          selectedPatient.docNumber,
                        ) ?? 'Sin documento'}
                      </Text>
                    </View>
                    <Pressable onPress={clearPatient} hitSlop={8}>
                      <AppIcon
                        icon={Icons.close}
                        size={18}
                        color={branding.colors.muted}
                      />
                    </Pressable>
                  </View>
                ) : (
                  <Text style={styles.searchEmpty}>
                    Aún no hay paciente seleccionado
                  </Text>
                )}
              </View>

              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Título de la cita"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />

              <View style={styles.stepBlock}>
                <View style={styles.stepHeader}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>3</Text>
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      !selectedDate && styles.stepLabelMuted,
                    ]}
                  >
                    Día (calendario)
                  </Text>
                </View>
                <CalendarDateField
                  value={selectedDate}
                  onChange={(date) => {
                    setSelectedDate(date);
                    setAppointmentTime('');
                    if (!date) {
                      setBlockReason('');
                      return;
                    }
                    const [y, m] = date.split('-').map(Number);
                    setAnchor(new Date(y, m - 1, 1));
                    const blocked = blockedByDate.get(date);
                    setBlockReason(blocked?.reason ?? '');
                  }}
                  onVisibleMonthChange={(month) => setAnchor(month)}
                  blockedByDate={blockedByDate}
                  apptCountByDate={apptCountByDate}
                  title="Elegir día de la cita"
                  placeholder="Toca para elegir el día"
                  accentColor={primary}
                  textColor={branding.colors.text}
                  mutedColor={branding.colors.muted}
                  triggerStyle={styles.selectField}
                  valueStyle={styles.selectFieldText}
                  accessibilityLabel="Elegir día en el calendario"
                />
                {selectedBlocked ? (
                  <Text style={styles.errorText}>
                    Día no disponible
                    {selectedBlocked.reason
                      ? `: ${selectedBlocked.reason}`
                      : ''}
                  </Text>
                ) : null}
              </View>

              <View style={styles.stepBlock}>
                <View style={styles.stepHeader}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>4</Text>
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      !appointmentTime && styles.stepLabelMuted,
                    ]}
                  >
                    Hora
                  </Text>
                </View>
                <Pressable
                  onPress={() => setHoursOpen((v) => !v)}
                  style={styles.selectField}
                >
                  <AppIcon
                    icon={Icons.clock}
                    size={18}
                    color={branding.colors.muted}
                  />
                  <Text
                    style={[
                      styles.selectFieldText,
                      !appointmentTime && styles.selectFieldPlaceholder,
                    ]}
                  >
                    {appointmentTime || 'Elige una hora'}
                  </Text>
                  <Text style={{ color: branding.colors.muted, fontSize: 12 }}>
                    {hoursOpen ? '▲' : '▼'}
                  </Text>
                </Pressable>
                {hoursOpen ? (
                  <View style={styles.hoursPanel}>
                    {hourOptions.length === 0 ? (
                      <Text style={styles.sectionSubtitle}>
                        {!selectedDate
                          ? 'Elige un día en el calendario'
                          : selectedBlocked
                            ? 'Día bloqueado'
                            : 'Sin horas libres'}
                      </Text>
                    ) : (
                      <View style={styles.chipRow}>
                        {hourOptions.map((t) => (
                          <Pressable
                            key={t}
                            onPress={() => {
                              setAppointmentTime(t);
                              setHoursOpen(false);
                            }}
                            hitSlop={6}
                            style={[
                              styles.chip,
                              appointmentTime === t && styles.chipActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                appointmentTime === t && styles.chipTextActive,
                              ]}
                            >
                              {t}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                ) : null}
              </View>

              <Pressable
                onPress={() => void propose()}
                style={styles.primaryBtn}
              >
                <Text style={styles.btnText}>Enviar propuesta</Text>
              </Pressable>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Citas</Text>
              <Text style={styles.sectionSubtitle}>
                Toca una cita para abrirla y cambiar el estado.
              </Text>
              <CalendarDateField
                value={searchFrom}
                rangeEnd={searchTo}
                onChange={(date) => {
                  setSearchFrom(date);
                  setSearchTo(date);
                  if (date) {
                    const [y, m] = date.split('-').map(Number);
                    setAnchor(new Date(y, m - 1, 1));
                  }
                }}
                onChangeRange={(fromDate, toDate) => {
                  setSearchFrom(fromDate);
                  setSearchTo(toDate);
                  if (fromDate) {
                    const [y, m] = fromDate.split('-').map(Number);
                    setAnchor(new Date(y, m - 1, 1));
                  }
                }}
                onVisibleMonthChange={(month) => setAnchor(month)}
                blockedByDate={blockedByDate}
                apptCountByDate={apptCountByDate}
                title="Buscar citas por fecha"
                placeholder="Buscar por fecha o rango"
                accentColor={primary}
                textColor={branding.colors.text}
                mutedColor={branding.colors.muted}
                triggerStyle={styles.searchBar}
                valueStyle={styles.searchInput}
                accessibilityLabel="Buscar citas por calendario"
              />
              {(overview?.appointments ?? []).length === 0 ? (
                <Text style={styles.emptyText}>Sin citas este mes.</Text>
              ) : filteredAppointments.length === 0 ? (
                <Text style={styles.emptyText}>
                  No hay citas que coincidan con esa fecha o rango.
                </Text>
              ) : (
                filteredAppointments.map((a: AgendaAppointment) => {
                  const open = openApptId === a.id;
                  return (
                    <View key={a.id} style={styles.appointmentCard}>
                      <Pressable
                        onPress={() => setOpenApptId(open ? null : a.id)}
                      >
                        <Text style={styles.appointmentTitle}>
                          {a.patient
                            ? `${a.patient.firstName} ${a.patient.lastName}`
                            : 'Paciente'}{' '}
                          · {STATUS_LABEL[a.status] ?? a.status}
                          {open ? ' ▲' : ' ▼'}
                        </Text>
                        <Text style={styles.sectionSubtitle}>
                          {formatApptRange(a.startsAt, a.endsAt)}
                        </Text>
                      </Pressable>
                      {open ? (
                        <View style={styles.statusRow}>
                          {(
                            [
                              ['confirmed', 'Confirmada', '#16A34A'],
                              ['completed', 'Completada', '#0284C7'],
                              ['cancelled', 'Cancelada', '#DC2626'],
                              ['declined', 'Rechazada', '#6B7280'],
                            ] as const
                          ).map(([status, label, color]) => {
                            const active = a.status === status;
                            return (
                              <Pressable
                                key={status}
                                onPress={() => void updateAppt(a.id, status)}
                                style={[
                                  styles.statusBtn,
                                  active && {
                                    backgroundColor: color,
                                    borderColor: color,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.statusBtnText,
                                    active && styles.statusBtnTextActive,
                                  ]}
                                >
                                  {label}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      ) : null}
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        )}
      </AppModuleChrome>
    </View>
  );
}
