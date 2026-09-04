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
  type AgendaOverview,
} from '../../services/agenda.service';
import { patientsService } from '../../services/patients.service';
import type { PatientProfile } from '../../types/patient';
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
  proposed: 'Pendiente',
  requested: 'Pendiente (solicitud)',
  confirmed: 'Confirmada',
  declined: 'Rechazada',
  cancelled: 'Cancelada',
  completed: 'Completada',
};

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

type DoctorAgendaViewProps = {
  onOpenMessages?: () => void;
  onOpenProfile?: () => void;
};

export function DoctorAgendaView({
  onOpenMessages,
  onOpenProfile,
}: DoctorAgendaViewProps) {
  const branding = useBranding();
  const styles = createHomeStyles(branding.colors);
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
  const [appointmentTime, setAppointmentTime] = useState('');
  const [title, setTitle] = useState('Consulta');
  const [openApptId, setOpenApptId] = useState<string | null>(null);

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
      const key = a.startsAt.slice(0, 10);
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
        {loading && !overview ? (
          <View style={styles.centered}>
            <ActivityIndicator color={primary} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.welcomeCard}>
              <Text style={[styles.welcomeTitle, { fontSize: 16 }]}>
                Calendario
              </Text>
              <Text style={styles.welcomeSubtitle}>
                Rojo = no disponible. Toca un día para bloquearlo o asignar cita.
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
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: selectedBlocked ? '#FEF2F2' : '#F3F4F6',
                    gap: 8,
                  }}
                >
                  <Text style={{ fontWeight: '700' }}>
                    Día {selectedDate} ·{' '}
                    {DAY_LABELS[dayOfWeekFromYmd(selectedDate)]}
                  </Text>
                  <TextInput
                    value={blockReason}
                    onChangeText={setBlockReason}
                    editable={!selectedBlocked}
                    placeholder="Motivo (días no disponibles)"
                    placeholderTextColor="#9CA3AF"
                    style={inputStyle(branding.colors.text)}
                  />
                  {selectedBlocked?.reason ? (
                    <Text style={{ color: '#B91C1C', fontSize: 13 }}>
                      Motivo: {selectedBlocked.reason}
                    </Text>
                  ) : null}
                  <Pressable
                    onPress={() => void toggleBlock()}
                    style={btnStyle(selectedBlocked ? primary : '#DC2626')}
                  >
                    <Text style={btnText}>
                      {selectedBlocked
                        ? 'Marcar como disponible'
                        : 'Marcar como no disponible'}
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {(overview?.weeklySlots.length ?? 0) > 0 ? (
                <View style={{ marginTop: 12, gap: 4 }}>
                  <Text style={{ fontWeight: '700', fontSize: 13 }}>
                    Horarios de atención
                  </Text>
                  {overview!.weeklySlots.map((s) => (
                    <Text key={s.id} style={styles.welcomeSubtitle}>
                      {DAY_LABELS[s.dayOfWeek]} · {s.startTime}–{s.endTime}
                    </Text>
                  ))}
                </View>
              ) : (
                <Text style={[styles.welcomeSubtitle, { marginTop: 10 }]}>
                  Sin horarios guardados: se ofrecen horas de 09:00 a 18:00.
                  Configúralos en el CRM para personalizarlos.
                </Text>
              )}
            </View>

            <View style={styles.welcomeCard}>
              <Text style={[styles.welcomeTitle, { fontSize: 16 }]}>
                Asignar cita
              </Text>
              <ScrollView
                horizontal
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                showsHorizontalScrollIndicator={false}
              >
                {patients.slice(0, 30).map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => setPatientId(p.id)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      marginRight: 8,
                      borderRadius: 999,
                      backgroundColor:
                        patientId === p.id ? primary : '#E5E7EB',
                    }}
                  >
                    <Text
                      style={{
                        color: patientId === p.id ? '#fff' : '#111',
                        fontWeight: '600',
                        fontSize: 12,
                      }}
                    >
                      {p.firstName} {p.lastName}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Título"
                placeholderTextColor="#9CA3AF"
                style={inputStyle(branding.colors.text)}
              />

              <Text
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  fontWeight: '700',
                  color: '#6B7280',
                }}
              >
                Día (calendario)
              </Text>
              <Text style={{ fontWeight: '700' }}>
                {selectedDate
                  ? `${selectedDate} · ${DAY_LABELS[dayOfWeekFromYmd(selectedDate)]}`
                  : 'Selecciona un día'}
              </Text>
              {selectedBlocked ? (
                <Text style={{ color: '#B91C1C', fontSize: 12, marginTop: 4 }}>
                  Día no disponible
                  {selectedBlocked.reason ? `: ${selectedBlocked.reason}` : ''}
                </Text>
              ) : null}

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
                      ? 'Elige un día'
                      : selectedBlocked
                        ? 'Día bloqueado'
                        : 'Sin horas libres'}
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

              <Pressable onPress={() => void propose()} style={btnStyle(primary)}>
                <Text style={btnText}>Enviar propuesta</Text>
              </Pressable>
            </View>

            <View style={styles.welcomeCard}>
              <Text style={[styles.welcomeTitle, { fontSize: 16 }]}>Citas</Text>
              <Text style={styles.welcomeSubtitle}>
                Toca una cita para abrirla y cambiar el estado.
              </Text>
              {(overview?.appointments ?? []).length === 0 ? (
                <Text style={styles.welcomeSubtitle}>Sin citas este mes.</Text>
              ) : (
                overview!.appointments.map((a: AgendaAppointment) => {
                  const open = openApptId === a.id;
                  return (
                    <View
                      key={a.id}
                      style={{
                        borderTopWidth: 1,
                        borderTopColor: '#E5E7EB',
                        marginTop: 10,
                        paddingTop: 10,
                        gap: 6,
                      }}
                    >
                      <Pressable
                        onPress={() => setOpenApptId(open ? null : a.id)}
                      >
                        <Text style={{ fontWeight: '700' }}>
                          {a.patient
                            ? `${a.patient.firstName} ${a.patient.lastName}`
                            : 'Paciente'}{' '}
                          · {STATUS_LABEL[a.status] ?? a.status}
                          {open ? ' ▲' : ' ▼'}
                        </Text>
                        <Text style={styles.welcomeSubtitle}>
                          {new Date(a.startsAt).toLocaleString()}
                        </Text>
                      </Pressable>
                      {open ? (
                        <View
                          style={{
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            gap: 8,
                            marginTop: 4,
                          }}
                        >
                          {(
                            [
                              ['confirmed', 'Confirmada', '#16A34A'],
                              ['completed', 'Completada', '#0284C7'],
                              ['cancelled', 'Cancelada', '#DC2626'],
                              ['declined', 'Rechazada', '#6B7280'],
                            ] as const
                          ).map(([status, label, color]) => (
                            <Pressable
                              key={status}
                              onPress={() => void updateAppt(a.id, status)}
                              style={{
                                ...btnStyle(
                                  a.status === status ? color : '#fff',
                                ),
                                marginTop: 0,
                                borderWidth: 1,
                                borderColor:
                                  a.status === status ? color : '#E5E7EB',
                              }}
                            >
                              <Text
                                style={{
                                  color:
                                    a.status === status ? '#fff' : '#111',
                                  fontWeight: '700',
                                  fontSize: 12,
                                }}
                              >
                                {label}
                              </Text>
                            </Pressable>
                          ))}
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

function inputStyle(color: string) {
  return {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    color,
  } as const;
}

function btnStyle(bg: string) {
  return {
    marginTop: 10,
    backgroundColor: bg,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center' as const,
  };
}

const btnText = { color: '#fff', fontWeight: '700' as const };
