import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { AppIcon } from './AppIcon';
import { Icons } from './icons';
import {
  daysInMonthGridLocal,
  ymdLocal,
} from '../views/agenda/AgendaMonthCalendar';

type CalendarDateFieldProps = {
  value: string | null;
  onChange: (isoYmd: string | null) => void;
  /** Si se define, el picker permite elegir un rango (inicio → fin). */
  rangeEnd?: string | null;
  onChangeRange?: (from: string | null, to: string | null) => void;
  title?: string;
  placeholder?: string;
  disabled?: boolean;
  /** false = no se pueden elegir fechas futuras (cumpleaños). Default true. */
  allowFuture?: boolean;
  /** false = no se pueden elegir fechas pasadas. Default true. */
  allowPast?: boolean;
  accentColor?: string;
  textColor?: string;
  mutedColor?: string;
  triggerStyle?: StyleProp<ViewStyle>;
  valueStyle?: StyleProp<TextStyle>;
  /** Icono a la izquierda del valor (estilo agenda). */
  showLeadingIcon?: boolean;
  accessibilityLabel?: string;
  /** Días bloqueados / no disponibles (rojo). */
  blockedByDate?: Map<string, { reason: string | null }>;
  /** Conteo de citas por día (azul + "Nc"). */
  apptCountByDate?: Map<string, number>;
  /** Al cambiar de mes en el modal (para cargar citas/bloqueos). */
  onVisibleMonthChange?: (monthAnchor: Date) => void;
  /** Si true, no deja elegir días bloqueados. Default false. */
  disableBlockedDays?: boolean;
};

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function formatDisplay(iso: string | null | undefined): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, m, d] = iso.split('-');
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  const dow = DAY_LABELS[date.getDay()] ?? '';
  return `${iso} · ${dow}`;
}

function formatRangeDisplay(from: string | null, to: string | null): string {
  if (from && to && from !== to) return `${from} a ${to}`;
  if (from) return formatDisplay(from);
  return '';
}

function parseIsoOrToday(iso: string | null | undefined): Date {
  if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date();
}

export function CalendarDateField({
  value,
  onChange,
  rangeEnd = null,
  onChangeRange,
  title = 'Seleccionar fecha',
  placeholder = 'Toca para elegir en el calendario',
  disabled = false,
  allowFuture = true,
  allowPast = true,
  accentColor = '#1E5A9E',
  textColor = '#1A1A1A',
  mutedColor = '#9CA3AF',
  triggerStyle,
  valueStyle,
  showLeadingIcon = true,
  accessibilityLabel,
  blockedByDate,
  apptCountByDate,
  onVisibleMonthChange,
  disableBlockedDays = false,
}: CalendarDateFieldProps) {
  const rangeMode = typeof onChangeRange === 'function';
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState(() => parseIsoOrToday(value));
  const [draftStart, setDraftStart] = useState<string | null>(value);
  const [draftEnd, setDraftEnd] = useState<string | null>(rangeEnd);
  const todayYmd = useMemo(() => ymdLocal(new Date()), []);
  const cells = useMemo(() => daysInMonthGridLocal(anchor), [anchor]);
  const monthLabel = anchor.toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric',
  });

  function goToMonth(next: Date) {
    const monthStart = new Date(next.getFullYear(), next.getMonth(), 1);
    setAnchor(monthStart);
    onVisibleMonthChange?.(monthStart);
  }

  function openPicker() {
    if (disabled) return;
    const start = parseIsoOrToday(value ?? rangeEnd);
    const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
    setAnchor(monthStart);
    setDraftStart(value);
    setDraftEnd(rangeEnd);
    setOpen(true);
    onVisibleMonthChange?.(monthStart);
  }

  function isDisabledDay(date: string): boolean {
    if (!allowFuture && date > todayYmd) return true;
    if (!allowPast && date < todayYmd) return true;
    if (disableBlockedDays && blockedByDate?.has(date)) return true;
    return false;
  }

  function selectDay(date: string) {
    if (isDisabledDay(date)) return;

    if (!rangeMode) {
      onChange(date);
      setOpen(false);
      return;
    }

    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStart(date);
      setDraftEnd(null);
      return;
    }

    if (date < draftStart) {
      setDraftEnd(draftStart);
      setDraftStart(date);
    } else {
      setDraftEnd(date);
    }
  }

  function applyRange() {
    if (!onChangeRange) return;
    if (draftStart && draftEnd) {
      onChangeRange(draftStart, draftEnd);
    } else if (draftStart) {
      onChangeRange(draftStart, draftStart);
    } else {
      onChangeRange(null, null);
    }
    setOpen(false);
  }

  const display = rangeMode
    ? formatRangeDisplay(value, rangeEnd)
    : formatDisplay(value);

  return (
    <>
      <Pressable
        onPress={openPicker}
        disabled={disabled}
        style={[styles.trigger, triggerStyle]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
      >
        {showLeadingIcon ? (
          <AppIcon icon={Icons.calendarDay} size={18} color={accentColor} />
        ) : null}
        <Text
          style={[
            styles.value,
            { color: display ? textColor : mutedColor },
            valueStyle,
          ]}
          numberOfLines={1}
        >
          {display || placeholder}
        </Text>
        {!showLeadingIcon ? (
          <AppIcon icon={Icons.calendarDay} size={18} color={accentColor} />
        ) : (
          <AppIcon icon={Icons.chevronRight} size={16} color={mutedColor} />
        )}
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.sheetTitle, { color: textColor }]}>{title}</Text>
            {rangeMode ? (
              <Text style={styles.hint}>
                {draftStart && !draftEnd
                  ? `Inicio: ${draftStart}. Elige la fecha final (o aplica una sola fecha).`
                  : draftStart && draftEnd
                    ? `Rango: ${draftStart} a ${draftEnd}`
                    : 'Toca un día para filtrar, o dos días para un rango.'}
              </Text>
            ) : null}

            <View style={styles.monthRow}>
              <Pressable
                hitSlop={10}
                onPress={() =>
                  goToMonth(
                    new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1),
                  )
                }
                style={styles.navBtn}
              >
                <Text style={{ fontWeight: '700', color: textColor }}>←</Text>
              </Pressable>
              <Text style={[styles.monthLabel, { color: textColor }]}>
                {monthLabel}
              </Text>
              <Pressable
                hitSlop={10}
                onPress={() =>
                  goToMonth(
                    new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1),
                  )
                }
                style={styles.navBtn}
              >
                <Text style={{ fontWeight: '700', color: textColor }}>→</Text>
              </Pressable>
            </View>

            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]} />
                <Text style={styles.legendText}>No disponible</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#DBEAFE', borderColor: '#93C5FD' }]} />
                <Text style={styles.legendText}>Con citas</Text>
              </View>
            </View>

            <View style={styles.weekHeader}>
              {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((d) => (
                <View key={d} style={styles.weekCell}>
                  <Text style={styles.weekText}>{d}</Text>
                </View>
              ))}
            </View>

            <View style={styles.grid}>
              {cells.map((cell, idx) => {
                if (!cell.date) {
                  return <View key={`e-${idx}`} style={styles.dayCell} />;
                }
                const blocked = blockedByDate?.get(cell.date);
                const count = apptCountByDate?.get(cell.date) ?? 0;
                const hasAppts = count > 0 && !blocked;
                const selected =
                  cell.date === draftStart ||
                  cell.date === draftEnd ||
                  (!rangeMode && cell.date === value);
                const inRange =
                  rangeMode &&
                  draftStart &&
                  draftEnd &&
                  cell.date > draftStart &&
                  cell.date < draftEnd;
                const disabledDay = isDisabledDay(cell.date);
                return (
                  <View key={cell.date} style={styles.dayCell}>
                    <Pressable
                      disabled={disabledDay}
                      onPress={() => selectDay(cell.date!)}
                      style={[
                        styles.dayBtn,
                        {
                          borderColor: selected
                            ? accentColor
                            : blocked
                              ? '#FECACA'
                              : hasAppts
                                ? '#93C5FD'
                                : '#E5E7EB',
                          borderWidth: selected ? 2 : 1,
                          backgroundColor: selected
                            ? accentColor
                            : inRange
                              ? `${accentColor}22`
                              : blocked
                                ? '#FEF2F2'
                                : hasAppts
                                  ? '#DBEAFE'
                                  : '#FFFFFF',
                        },
                        disabledDay && styles.dayDisabled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          {
                            color: selected
                              ? '#FFFFFF'
                              : disabledDay
                                ? '#D1D5DB'
                                : blocked
                                  ? '#B91C1C'
                                  : hasAppts
                                    ? '#1D4ED8'
                                    : textColor,
                          },
                        ]}
                      >
                        {cell.day}
                      </Text>
                      {count > 0 ? (
                        <Text
                          style={[
                            styles.dayCount,
                            {
                              color: selected
                                ? '#FFFFFF'
                                : blocked
                                  ? '#B91C1C'
                                  : '#1D4ED8',
                            },
                          ]}
                        >
                          {count}c
                        </Text>
                      ) : null}
                    </Pressable>
                  </View>
                );
              })}
            </View>

            <View style={styles.footer}>
              <Pressable
                onPress={() => {
                  if (rangeMode && onChangeRange) {
                    onChangeRange(null, null);
                  } else {
                    onChange(null);
                  }
                  setDraftStart(null);
                  setDraftEnd(null);
                  setOpen(false);
                }}
              >
                <Text style={{ color: '#6B7280', fontWeight: '600' }}>
                  Limpiar
                </Text>
              </Pressable>
              {rangeMode ? (
                <Pressable
                  onPress={applyRange}
                  disabled={!draftStart}
                  style={[
                    styles.applyBtn,
                    { backgroundColor: accentColor, opacity: draftStart ? 1 : 0.45 },
                  ]}
                >
                  <Text style={styles.applyText}>Aplicar</Text>
                </Pressable>
              ) : (
                <Pressable onPress={() => setOpen(false)}>
                  <Text style={{ color: accentColor, fontWeight: '700' }}>
                    Cerrar
                  </Text>
                </Pressable>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  value: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  hint: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  weekHeader: { flexDirection: 'row' },
  weekCell: { flex: 1, alignItems: 'center' },
  weekText: { fontSize: 11, fontWeight: '700', color: '#9CA3AF' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, padding: 2 },
  dayBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  dayDisabled: { opacity: 0.45 },
  dayText: { fontSize: 13, fontWeight: '700' },
  dayCount: { fontSize: 8, fontWeight: '700' },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 4,
    borderWidth: 1,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  applyBtn: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  applyText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
