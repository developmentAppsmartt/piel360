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
import { useBranding } from '../../context/BrandingContext';
import { ApiError } from '../../services/api.client';
import {
  agendaService,
  type AgendaAppointment,
  type PatientDoctorCalendar,
} from '../../services/agenda.service';
import { notificationsService } from '../../services/notifications.service';
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
  ymdLocal,
} from './AgendaMonthCalendar';

const STATUS_LABEL: Record<string, string> = {
  proposed: 'Asignada por tu profesional',
  requested: 'Solicitud enviada',
  confirmed: 'Confirmada',
  declined: 'Rechazada',
  cancelled: 'Cancelada',
  completed: 'Completada',
};

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function formatApptRange(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime())) return '';
  const date = start.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const startTime = start.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const endTime = Number.isNaN(end.getTime())
    ? ''
    : end.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
      });
  return endTime ? `${date}, ${startTime} – ${endTime}` : `${date}, ${startTime}`;
}

function sortPatientAppointments(
  list: AgendaAppointment[],
): AgendaAppointment[] {
  const rank = (a: AgendaAppointment) => {
    if (a.status === 'proposed') return 0;
    if (a.status === 'requested') return 1;
    if (a.status === 'confirmed') return 2;
    return 3;
  };
  return [...list].sort((a, b) => {
    const byRank = rank(a) - rank(b);
    if (byRank !== 0) return byRank;
    return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
  });
}

type PatientAgendaViewProps = {
  onOpenMessages?: () => void;
  onOpenProfile?: () => void;
};

export function PatientAgendaView({
  onOpenMessages,
  onOpenProfile,
}: PatientAgendaViewProps) {
  const branding = useBranding();
  const styles = useMemo(
    () => createAgendaStyles(branding.colors),
    [branding.colors],
  );
  const primary = branding.colors.primary;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [calendar, setCalendar] = useState<PatientDoctorCalendar | null>(null);
  const [appointments, setAppointments] = useState<AgendaAppointment[]>([]);
  const [anchor, setAnchor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [appointmentTime, setAppointmentTime] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [openApptId, setOpenApptId] = useState<string | null>(null);

  const { from, to } = useMemo(() => monthBoundsLocal(anchor), [anchor]);

  const load = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (!opts?.soft) setLoading(true);
      try {
        const [cal, mine] = await Promise.all([
          agendaService.getMyDoctorCalendar(from, to).catch(() => null),
          agendaService
            .listMyAppointments()
            .catch(() => [] as AgendaAppointment[]),
        ]);
        setCalendar(cal);
        setAppointments(mine);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [from, to],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const blockedByDate = useMemo(() => {
    const map = new Map<string, { reason: string | null }>();
    for (const b of calendar?.blockedDays ?? []) {
      map.set(b.date, { reason: b.reason });
    }
    return map;
  }, [calendar?.blockedDays]);

  const apptCountByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of appointments) {
      if (!['proposed', 'requested', 'confirmed'].includes(a.status)) continue;
      const key = ymdLocal(new Date(a.startsAt));
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [appointments]);

  const sortedAppointments = useMemo(
    () => sortPatientAppointments(appointments),
    [appointments],
  );

  const filteredAppointments = useMemo(() => {
    if (!selectedDate) return sortedAppointments;
    return sortedAppointments.filter(
      (a) => ymdLocal(new Date(a.startsAt)) === selectedDate,
    );
  }, [sortedAppointments, selectedDate]);

  const hourOptions = useMemo(() => {
    if (!selectedDate || blockedByDate.has(selectedDate)) return [];
    return availableStartTimes(
      selectedDate,
      calendar?.weeklySlots ?? [],
      (calendar?.busySlots ?? []).map((b) => ({
        startsAt: b.startsAt,
        endsAt: b.endsAt,
        status: b.status,
      })),
    );
  }, [selectedDate, blockedByDate, calendar?.weeklySlots, calendar?.busySlots]);

  useEffect(() => {
    if (appointmentTime && !hourOptions.includes(appointmentTime)) {
      setAppointmentTime('');
    }
  }, [hourOptions, appointmentTime]);

  async function submitRequest() {
    if (!selectedDate || !appointmentTime) {
      Alert.alert(
        'Faltan datos',
        'Selecciona un día en el calendario y una hora.',
      );
      return;
    }
    if (blockedByDate.has(selectedDate)) {
      Alert.alert('No disponible', 'Ese día está marcado como no disponible.');
      return;
    }
    setSubmitting(true);
    try {
      const startsAt = localDateTimeIso(selectedDate, appointmentTime);
      const [hh, mm] = appointmentTime.split(':').map(Number);
      const endsAt = localDateTimeIso(
        selectedDate,
        minutesToTime(hh * 60 + mm + SLOT_MINUTES),
      );
      await agendaService.requestAppointment({
        startsAt,
        endsAt,
        notes: notes.trim() || undefined,
        title: 'Solicitud de cita',
      });
      setAppointmentTime('');
      setNotes('');
      await load({ soft: true });
      Alert.alert('Solicitud enviada', 'Tu profesional la verá en su agenda.');
    } catch (err) {
      Alert.alert(
        'No se pudo solicitar',
        err instanceof ApiError ? err.message : 'Intenta de nuevo',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function respond(
    id: string,
    status: 'confirmed' | 'declined' | 'cancelled',
  ) {
    try {
      await agendaService.updateMyAppointment(id, status);
      await notificationsService.markAppointmentRead(id);
      await load({ soft: true });
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
        {loading && !calendar && appointments.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator color={primary} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  void load({ soft: true });
                }}
                tintColor={primary}
              />
            }
          >
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>
                {calendar?.doctor
                  ? `${calendar.doctor.firstName} ${calendar.doctor.lastName}`
                  : 'Sin profesional'}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {calendar?.message ??
                  'Toca un día disponible para asignar una cita.'}
              </Text>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Calendario</Text>
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
                  setSelectedDate((prev) => (prev === date ? null : date));
                  setAppointmentTime('');
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
                  {selectedBlocked ? (
                    <Text style={styles.errorText}>
                      No disponible
                      {selectedBlocked.reason
                        ? `: ${selectedBlocked.reason}`
                        : ''}
                    </Text>
                  ) : (
                    <Text style={styles.mutedText}>
                      Disponible para solicitud
                    </Text>
                  )}
                </View>
              ) : null}

              {(calendar?.weeklySlots.length ?? 0) > 0 ? (
                <View style={{ marginTop: 12, gap: 6 }}>
                  <Text style={styles.dayPanelTitle}>Horarios de atención</Text>
                  <View style={styles.weeklySlotsGrid}>
                    {calendar!.weeklySlots.map((s) => (
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
                  Sin horarios del profesional: se ofrecen horas de 09:00 a
                  18:00.
                </Text>
              )}
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Solicitar cita</Text>
              <Text style={styles.sectionSubtitle}>
                Día desde el calendario · hora según horarios de atención
              </Text>

              <Text style={styles.mutedText}>Día</Text>
              <Text style={styles.dayPanelTitle}>
                {selectedDate
                  ? `${selectedDate} · ${DAY_LABELS[dayOfWeekFromYmd(selectedDate)]}`
                  : 'Selecciona un día en el calendario'}
              </Text>

              <Text style={[styles.mutedText, { marginTop: 6 }]}>Hora</Text>
              <View style={styles.chipRow}>
                {hourOptions.length === 0 ? (
                  <Text style={styles.sectionSubtitle}>
                    {!selectedDate
                      ? 'Elige un día primero'
                      : selectedBlocked
                        ? 'Día no disponible'
                        : 'Sin horas libres ese día'}
                  </Text>
                ) : (
                  hourOptions.map((t) => (
                    <Pressable
                      key={t}
                      onPress={() => setAppointmentTime(t)}
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
                  ))
                )}
              </View>

              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Nota (opcional)"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />
              <Pressable
                onPress={() => void submitRequest()}
                disabled={submitting || !calendar?.doctor}
                style={[
                  styles.primaryBtn,
                  {
                    opacity: submitting || !calendar?.doctor ? 0.6 : 1,
                  },
                ]}
              >
                <Text style={styles.btnText}>Enviar solicitud</Text>
              </Pressable>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>
                {selectedDate ? `Mis citas · ${selectedDate}` : 'Mis citas'}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {selectedDate
                  ? 'Filtrado por el día del calendario. Toca otra vez el mismo día para ver todas.'
                  : 'Incluye las que te asigna tu profesional y las que solicitas. Toca una para responder o cambiar el estado.'}
              </Text>
              {selectedDate ? (
                <Pressable
                  onPress={() => {
                    setSelectedDate(null);
                    setAppointmentTime('');
                  }}
                  style={[styles.chip, { alignSelf: 'flex-start', marginBottom: 8 }]}
                >
                  <Text style={styles.chipText}>Ver todas</Text>
                </Pressable>
              ) : null}
              {sortedAppointments.length === 0 ? (
                <Text style={styles.emptyText}>Aún no tienes citas.</Text>
              ) : filteredAppointments.length === 0 ? (
                <Text style={styles.emptyText}>
                  No hay citas el {selectedDate}.
                </Text>
              ) : (
                filteredAppointments.map((a) => {
                  const open = openApptId === a.id;
                  const doctorName = a.doctor
                    ? `Dr. ${a.doctor.firstName} ${a.doctor.lastName}`.trim()
                    : null;
                  const isProposed = a.status === 'proposed';
                  return (
                    <View
                      key={a.id}
                      style={[
                        styles.appointmentCard,
                        isProposed
                          ? {
                              borderColor: `${primary}66`,
                              backgroundColor: `${primary}0F`,
                            }
                          : null,
                      ]}
                    >
                      <Pressable
                        onPress={() => setOpenApptId(open ? null : a.id)}
                      >
                        <Text style={styles.appointmentTitle}>
                          {STATUS_LABEL[a.status] ?? a.status}
                          {isProposed ? ' — responde' : ''}
                          {open ? ' ▲' : ' ▼'}
                        </Text>
                        {a.title ? (
                          <Text style={styles.mutedText}>{a.title}</Text>
                        ) : null}
                        {doctorName ? (
                          <Text style={styles.mutedText}>{doctorName}</Text>
                        ) : null}
                        <Text style={styles.sectionSubtitle}>
                          {formatApptRange(a.startsAt, a.endsAt)}
                        </Text>
                        {isProposed && !open ? (
                          <Text
                            style={[
                              styles.mutedText,
                              {
                                color: primary,
                                fontWeight: '700',
                                marginTop: 4,
                              },
                            ]}
                          >
                            Tu profesional te asignó esta cita
                          </Text>
                        ) : null}
                      </Pressable>
                      {open ? (
                        <View style={{ gap: 8, marginTop: 4 }}>
                          {a.notes ? (
                            <Text style={styles.sectionSubtitle}>
                              Nota: {a.notes}
                            </Text>
                          ) : null}
                          {a.status === 'proposed' ? (
                            <View style={styles.statusRow}>
                              <Pressable
                                onPress={() => void respond(a.id, 'confirmed')}
                                style={[
                                  styles.statusBtn,
                                  {
                                    backgroundColor: '#16A34A',
                                    borderColor: '#16A34A',
                                  },
                                ]}
                              >
                                <Text style={styles.statusBtnTextActive}>
                                  Aceptar
                                </Text>
                              </Pressable>
                              <Pressable
                                onPress={() => void respond(a.id, 'declined')}
                                style={[
                                  styles.statusBtn,
                                  {
                                    backgroundColor: '#DC2626',
                                    borderColor: '#DC2626',
                                  },
                                ]}
                              >
                                <Text style={styles.statusBtnTextActive}>
                                  Rechazar
                                </Text>
                              </Pressable>
                            </View>
                          ) : null}
                          {['proposed', 'requested', 'confirmed'].includes(
                            a.status,
                          ) ? (
                            <Pressable
                              onPress={() => void respond(a.id, 'cancelled')}
                              style={[
                                styles.statusBtn,
                                { borderColor: '#FECACA' },
                              ]}
                            >
                              <Text style={styles.errorText}>
                                Cancelar cita
                              </Text>
                            </Pressable>
                          ) : (
                            <Text style={styles.sectionSubtitle}>
                              Esta cita ya no admite cambios.
                            </Text>
                          )}
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
