import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

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
};

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
}: AgendaMonthCalendarProps) {
  const cells = useMemo(() => daysInMonthGridLocal(anchor), [anchor]);
  const monthLabel = anchor.toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <Pressable
          onPress={onPrevMonth}
          hitSlop={10}
          style={{
            borderWidth: 1,
            borderColor: '#E5E7EB',
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <Text style={{ fontWeight: '700', color: textColor }}>←</Text>
        </Pressable>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '800',
            color: textColor,
            textTransform: 'capitalize',
          }}
        >
          {monthLabel}
        </Text>
        <Pressable
          onPress={onNextMonth}
          hitSlop={10}
          style={{
            borderWidth: 1,
            borderColor: '#E5E7EB',
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <Text style={{ fontWeight: '700', color: textColor }}>→</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', marginBottom: 4 }}>
        {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((d) => (
          <View key={d} style={{ flex: 1, alignItems: 'center' }}>
            <Text
              style={{ fontSize: 11, fontWeight: '700', color: '#9CA3AF' }}
            >
              {d}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((cell, idx) => {
          if (!cell.date) {
            return (
              <View
                key={`e-${idx}`}
                style={{ width: '14.28%', aspectRatio: 1, padding: 2 }}
              />
            );
          }
          const blocked = blockedByDate.get(cell.date);
          const count = apptCountByDate?.get(cell.date) ?? 0;
          const hasAppts = count > 0 && !blocked;
          const selected = selectedDate === cell.date;
          return (
            <View
              key={cell.date}
              style={{ width: '14.28%', aspectRatio: 1, padding: 2 }}
            >
              <Pressable
                onPress={() => onSelectDate(cell.date!)}
                style={{
                  flex: 1,
                  borderRadius: 12,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected
                    ? primaryColor
                    : blocked
                      ? '#FECACA'
                      : hasAppts
                        ? '#93C5FD'
                        : '#E5E7EB',
                  backgroundColor: blocked
                    ? '#FEF2F2'
                    : hasAppts
                      ? '#DBEAFE'
                      : '#FFFFFF',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '800',
                    color: blocked
                      ? '#B91C1C'
                      : hasAppts
                        ? '#1D4ED8'
                        : textColor,
                  }}
                >
                  {cell.day}
                </Text>
                {count > 0 ? (
                  <Text
                    style={{
                      fontSize: 8,
                      fontWeight: '700',
                      color: blocked ? '#B91C1C' : '#1D4ED8',
                    }}
                  >
                    {count}c
                  </Text>
                ) : null}
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}
