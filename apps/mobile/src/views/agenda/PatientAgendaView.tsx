import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
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
import { AppModuleChrome } from '../shared/AppModuleChrome';
import { createHomeStyles } from '../home/styles/home.styles';
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
  proposed: 'Pendiente — responde',
  requested: 'Solicitud enviada',
  confirmed: 'Confirmada',
  declined: 'Rechazada',
  cancelled: 'Cancelada',
  completed: 'Completada',
};

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

type PatientAgendaViewProps = {
  onOpenMessages?: () => void;
  onOpenProfile?: () => void;
};

export function PatientAgendaView({
  onOpenMessages,
  onOpenProfile,
}: PatientAgendaViewProps) {
  const branding = useBranding();
  const styles = createHomeStyles(branding.colors);
  const primary = branding.colors.primary;

  const [loading, setLoading] = useState(true);
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cal, mine] = await Promise.all([
        agendaService.getMyDoctorCalendar(from, to),
        agendaService.listMyAppointments(),
      ]);
      setCalendar(cal);
      setAppointments(mine);
    } catch {
      setCalendar(null);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

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
      const key = a.startsAt.slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [appointments]);

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
      Alert.alert('Faltan datos', 'Selecciona un día en el calendario y una hora.');
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
      await load();
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
    <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
      <AppModuleChrome
        onOpenMessages={onOpenMessages}
        onOpenProfile={onOpenProfile}
      >
        {loading && !calendar ? (
          <View style={styles.centered}>
            <ActivityIndicator color={primary} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.welcomeCard}>
              <Text style={styles.welcomeTitle}>
                {calendar?.doctor
                  ? `${calendar.doctor.firstName} ${calendar.doctor.lastName}`
                  : 'Sin profesional'}
              </Text>
              <Text style={styles.welcomeSubtitle}>
                {calendar?.message ??
                  'Toca un día en el calendario. Rojo = no disponible.'}
              </Text>
            </View>

            <View style={styles.welcomeCard}>
              <Text style={[styles.welcomeTitle, { fontSize: 16 }]}>
                Calendario
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
                }}
                blockedByDate={blockedByDate}
                apptCountByDate={apptCountByDate}
                primaryColor={primary}
                textColor={branding.colors.text}
              />

              {selectedDate ? (
                <View
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: selectedBlocked ? '#FEF2F2' : '#F3F4F6',
                  }}
                >
                  <Text style={{ fontWeight: '700', color: branding.colors.text }}>
                    Día {selectedDate} · {DAY_LABELS[dayOfWeekFromYmd(selectedDate)]}
                  </Text>
                  {selectedBlocked ? (
                    <Text style={{ marginTop: 4, color: '#B91C1C', fontSize: 13 }}>
                      No disponible
                      {selectedBlocked.reason
                        ? `: ${selectedBlocked.reason}`
                        : ''}
                    </Text>
                  ) : (
                    <Text style={{ marginTop: 4, color: '#6B7280', fontSize: 13 }}>
                      Disponible para solicitud
                    </Text>
                  )}
                </View>
              ) : null}

              {(calendar?.weeklySlots.length ?? 0) > 0 ? (
                <View style={{ marginTop: 12, gap: 4 }}>
                  <Text style={{ fontWeight: '700', fontSize: 13 }}>
                    Horarios de atención
                  </Text>
                  {calendar!.weeklySlots.map((s) => (
                    <Text key={s.id} style={styles.welcomeSubtitle}>
                      {DAY_LABELS[s.dayOfWeek]} · {s.startTime}–{s.endTime}
                    </Text>
                  ))}
                </View>
              ) : (
                <Text style={[styles.welcomeSubtitle, { marginTop: 10 }]}>
                  Sin horarios del profesional: se ofrecen horas de 09:00 a
                  18:00.
                </Text>
              )}
            </View>

            <View style={styles.welcomeCard}>
              <Text style={[styles.welcomeTitle, { fontSize: 16 }]}>
                Solicitar cita
              </Text>
              <Text style={styles.welcomeSubtitle}>
                Día desde el calendario · hora según horarios de atención
              </Text>

              <Text
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  fontWeight: '700',
                  color: '#6B7280',
                }}
              >
                Día
              </Text>
              <Text style={{ fontWeight: '700', color: branding.colors.text }}>
                {selectedDate
                  ? `${selectedDate} · ${DAY_LABELS[dayOfWeekFromYmd(selectedDate)]}`
                  : 'Selecciona un día en el calendario'}
              </Text>

              <Text
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  fontWeight: '700',
                  color: '#6B7280',
                }}
              >
                Hora
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 8,
                  marginTop: 4,
                }}
              >
                {hourOptions.length === 0 ? (
                  <Text style={styles.welcomeSubtitle}>
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
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 999,
                        backgroundColor:
                          appointmentTime === t ? primary : '#E5E7EB',
                      }}
                    >
                      <Text
                        style={{
                          fontWeight: '700',
                          color: appointmentTime === t ? '#fff' : '#111',
                        }}
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
                style={{
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  borderRadius: 12,
                  padding: 12,
                  marginTop: 10,
                  color: branding.colors.text,
                }}
              />
              <Pressable
                onPress={() => void submitRequest()}
                disabled={submitting || !calendar?.doctor}
                style={{
                  marginTop: 12,
                  backgroundColor: primary,
                  borderRadius: 999,
                  paddingVertical: 12,
                  alignItems: 'center',
                  opacity: submitting || !calendar?.doctor ? 0.6 : 1,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>
                  Enviar solicitud
                </Text>
              </Pressable>
            </View>

            <View style={styles.welcomeCard}>
              <Text style={[styles.welcomeTitle, { fontSize: 16 }]}>
                Mis citas
              </Text>
              <Text style={styles.welcomeSubtitle}>
                Toca una cita para abrirla y cambiar el estado.
              </Text>
              {appointments.length === 0 ? (
                <Text style={styles.welcomeSubtitle}>Aún no tienes citas.</Text>
              ) : (
                appointments.map((a) => {
                  const open = openApptId === a.id;
                  return (
                    <View
                      key={a.id}
                      style={{
                        borderTopWidth: 1,
                        borderTopColor: '#E5E7EB',
                        paddingTop: 10,
                        marginTop: 10,
                        gap: 6,
                      }}
                    >
                      <Pressable onPress={() => setOpenApptId(open ? null : a.id)}>
                        <Text
                          style={{
                            fontWeight: '700',
                            color: branding.colors.text,
                          }}
                        >
                          {STATUS_LABEL[a.status] ?? a.status}
                          {open ? ' ▲' : ' ▼'}
                        </Text>
                        <Text style={styles.welcomeSubtitle}>
                          {new Date(a.startsAt).toLocaleString()} —{' '}
                          {new Date(a.endsAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </Pressable>
                      {open ? (
                        <View style={{ gap: 8, marginTop: 4 }}>
                          {a.notes ? (
                            <Text style={styles.welcomeSubtitle}>
                              Nota: {a.notes}
                            </Text>
                          ) : null}
                          {a.status === 'proposed' ? (
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                              <Pressable
                                onPress={() => void respond(a.id, 'confirmed')}
                                style={{
                                  backgroundColor: '#16A34A',
                                  borderRadius: 999,
                                  paddingHorizontal: 12,
                                  paddingVertical: 8,
                                }}
                              >
                                <Text style={{ color: '#fff', fontWeight: '700' }}>
                                  Aceptar
                                </Text>
                              </Pressable>
                              <Pressable
                                onPress={() => void respond(a.id, 'declined')}
                                style={{
                                  backgroundColor: '#DC2626',
                                  borderRadius: 999,
                                  paddingHorizontal: 12,
                                  paddingVertical: 8,
                                }}
                              >
                                <Text style={{ color: '#fff', fontWeight: '700' }}>
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
                              style={{
                                borderWidth: 1,
                                borderColor: '#FECACA',
                                borderRadius: 999,
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                alignSelf: 'flex-start',
                              }}
                            >
                              <Text
                                style={{ color: '#B91C1C', fontWeight: '700' }}
                              >
                                Cancelar cita
                              </Text>
                            </Pressable>
                          ) : (
                            <Text style={styles.welcomeSubtitle}>
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
