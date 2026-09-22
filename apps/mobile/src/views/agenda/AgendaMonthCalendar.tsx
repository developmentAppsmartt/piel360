import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { Icons } from '../../components/icons';

export type CalendarCell = { date: string | null; day: number | null };

export function ymdLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseYmdLocal(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function dayOfWeekFromYmd(dateStr: string) {
  return parseYmdLocal(dateStr).getDay();
}

export function monthBoundsLocal(anchor: Date) {
  const from = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const to = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  return { from: ymdLocal(from), to: ymdLocal(to) };
}

export function daysInMonthGridLocal(anchor: Date): CalendarCell[] {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const cells: CalendarCell[] = [];
  for (let i = 0; i < startPad; i++) cells.push({ date: null, day: null });
  for (let d = 1; d <= lastDate; d++) {
    cells.push({ date: ymdLocal(new Date(year, month, d)), day: d });
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, day: null });
  return cells;
}

export function normalizeTime(t: string) {
  const [h = '0', m = '0'] = t.split(':');
  return `${String(Number(h)).padStart(2, '0')}:${String(Number(m)).padStart(2, '0')}`;
}

export function timeToMinutes(t: string) {
  const [h, m] = normalizeTime(t).split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function localYmdFromIso(iso: string) {
  return ymdLocal(new Date(iso));
}

export function localDateTimeIso(dateStr: string, timeStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0).toISOString();
}

const SLOT_MINUTES = 30;

export function availableStartTimes(
  dateStr: string,
  weeklySlots: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isActive?: boolean;
  }[],
  busy: { startsAt: string; endsAt: string; status?: string }[],
  slotMinutes = SLOT_MINUTES,
): string[] {
  const dow = dayOfWeekFromYmd(dateStr);
  let franjas = weeklySlots.filter(
    (s) => (s.isActive ?? true) && s.dayOfWeek === dow,
  );
  // Sin horarios configurados: ofrecer jornada por defecto para poder elegir hora.
  if (franjas.length === 0 && weeklySlots.length === 0) {
    franjas = [
      {
        dayOfWeek: dow,
        startTime: '09:00',
        endTime: '18:00',
        isActive: true,
      },
    ];
  }
  if (franjas.length === 0) return [];

  const activeBusy = busy.filter((a) => {
    const onDay =
      localYmdFromIso(a.startsAt) === dateStr ||
      localYmdFromIso(a.endsAt) === dateStr;
    if (!onDay) return false;
    if (!a.status) return true;
    return ['proposed', 'requested', 'confirmed'].includes(a.status);
  });

  const times: string[] = [];
  for (const f of franjas) {
    let cursor = timeToMinutes(f.startTime);
    const end = timeToMinutes(f.endTime);
    while (cursor + slotMinutes <= end) {
      const startLabel = minutesToTime(cursor);
      const startMs = parseYmdLocal(dateStr);
      startMs.setHours(Math.floor(cursor / 60), cursor % 60, 0, 0);
      const endMs = new Date(startMs.getTime() + slotMinutes * 60_000);
      const overlaps = activeBusy.some((a) => {
        const aStart = new Date(a.startsAt).getTime();
        const aEnd = new Date(a.endsAt).getTime();
        return startMs.getTime() < aEnd && endMs.getTime() > aStart;
      });
      if (!overlaps) times.push(startLabel);
      cursor += slotMinutes;
    }
  }
  return [...new Set(times)].sort();
}

export { SLOT_MINUTES };

const BLOCKED_BG = '#FEE2E2';
const BLOCKED_BORDER = '#FECACA';
const BLOCKED_FG = '#DC2626';
const APPT_BG = '#DBEAFE';
const APPT_BORDER = '#93C5FD';
const APPT_FG = '#1D4ED8';
const AVAILABLE_BG = '#FFFFFF';
const AVAILABLE_BORDER = '#E5E7EB';

type AgendaMonthCalendarProps = {
  anchor: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  blockedByDate: Map<string, { reason: string | null }>;
  apptCountByDate?: Map<string, number>;
  primaryColor: string;
  textColor: string;
  /** Muestra la leyenda de convenciones encima del mes. */
  showLegend?: boolean;
};

function CalendarLegend() {
  return (
    <View style={calStyles.legendRow}>
      <View style={calStyles.legendItem}>
        <View
          style={[
            calStyles.legendSwatch,
            { backgroundColor: BLOCKED_BG, borderColor: BLOCKED_BORDER },
          ]}
        >
          <AppIcon icon={Icons.lock} size={12} color={BLOCKED_FG} />
        </View>
        <Text style={calStyles.legendLabel}>No disponible / Bloqueado</Text>
      </View>
      <View style={calStyles.legendItem}>
        <View
          style={[
            calStyles.legendSwatch,
            { backgroundColor: APPT_BG, borderColor: APPT_BORDER },
          ]}
        >
          <AppIcon icon={Icons.calendarDay} size={11} color={APPT_FG} />
          <View style={calStyles.legendBadge}>
            <Text style={calStyles.legendBadgeText}>1</Text>
          </View>
        </View>
        <Text style={calStyles.legendLabel}>Con citas</Text>
      </View>
      <View style={calStyles.legendItem}>
        <View
          style={[
            calStyles.legendSwatch,
            { backgroundColor: AVAILABLE_BG, borderColor: AVAILABLE_BORDER },
          ]}
        />
        <Text style={calStyles.legendLabel}>Disponible</Text>
      </View>
    </View>
  );
}

export function AgendaMonthCalendar({
  anchor,
  onPrevMonth,
  onNextMonth,
  selectedDate,
  onSelectDate,
  blockedByDate,
  apptCountByDate,
  primaryColor,
  textColor,
  showLegend = true,
}: AgendaMonthCalendarProps) {
  const cells = useMemo(() => daysInMonthGridLocal(anchor), [anchor]);
  const monthLabel = anchor.toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <View>
      {showLegend ? <CalendarLegend /> : null}

      <View style={calStyles.navRow}>
        <Pressable onPress={onPrevMonth} hitSlop={10} style={calStyles.navBtn}>
          <Text style={[calStyles.navBtnText, { color: textColor }]}>←</Text>
        </Pressable>
        <Text style={[calStyles.monthLabel, { color: textColor }]}>
          {monthLabel}
        </Text>
        <Pressable onPress={onNextMonth} hitSlop={10} style={calStyles.navBtn}>
          <Text style={[calStyles.navBtnText, { color: textColor }]}>→</Text>
        </Pressable>
      </View>

      <View style={calStyles.weekHeader}>
        {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((d) => (
          <View key={d} style={calStyles.weekCell}>
            <Text style={calStyles.weekText}>{d}</Text>
          </View>
        ))}
      </View>

      <View style={calStyles.grid}>
        {cells.map((cell, idx) => {
          if (!cell.date) {
            return <View key={`e-${idx}`} style={calStyles.dayCell} />;
          }
          const blocked = Boolean(blockedByDate.get(cell.date));
          const count = apptCountByDate?.get(cell.date) ?? 0;
          const hasAppts = count > 0 && !blocked;
          const selected = selectedDate === cell.date;
          const dayColor = blocked
            ? BLOCKED_FG
            : hasAppts
              ? APPT_FG
              : textColor;

          return (
            <View key={cell.date} style={calStyles.dayCell}>
              <Pressable
                onPress={() => onSelectDate(cell.date!)}
                accessibilityLabel={
                  blocked
                    ? `Día ${cell.day}, no disponible`
                    : hasAppts
                      ? `Día ${cell.day}, ${count} cita${count === 1 ? '' : 's'}`
                      : `Día ${cell.day}, disponible`
                }
                style={[
                  calStyles.dayBtn,
                  {
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected
                      ? primaryColor
                      : blocked
                        ? BLOCKED_BORDER
                        : hasAppts
                          ? APPT_BORDER
                          : AVAILABLE_BORDER,
                    backgroundColor: blocked
                      ? BLOCKED_BG
                      : hasAppts
                        ? APPT_BG
                        : AVAILABLE_BG,
                  },
                ]}
              >
                <Text style={[calStyles.dayNumber, { color: dayColor }]}>
                  {cell.day}
                </Text>
                {blocked ? (
                  <AppIcon icon={Icons.lock} size={12} color={BLOCKED_FG} />
                ) : hasAppts ? (
                  <View style={calStyles.apptMeta}>
                    <AppIcon
                      icon={Icons.calendarDay}
                      size={11}
                      color={APPT_FG}
                    />
                    <View style={calStyles.apptBadge}>
                      <Text style={calStyles.apptBadgeText}>
                        {count > 9 ? '9+' : String(count)}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={calStyles.dayMetaSpacer} />
                )}
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const calStyles = StyleSheet.create({
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  legendBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: APPT_FG,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  legendBadgeText: {
    fontSize: 7,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  navBtn: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  navBtnText: { fontWeight: '700' },
  monthLabel: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  weekHeader: { flexDirection: 'row', marginBottom: 4 },
  weekCell: { flex: 1, alignItems: 'center' },
  weekText: { fontSize: 11, fontWeight: '700', color: '#9CA3AF' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, padding: 2 },
  dayBtn: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  dayNumber: {
    fontSize: 13,
    fontWeight: '800',
  },
  dayMetaSpacer: {
    height: 14,
  },
  apptMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  apptBadge: {
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: APPT_FG,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  apptBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
