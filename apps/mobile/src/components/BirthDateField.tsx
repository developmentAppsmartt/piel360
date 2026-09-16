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

type BirthDateFieldProps = {
  value: string;
  onChange: (isoYmd: string) => void;
  label?: string;
  labelStyle?: StyleProp<TextStyle>;
  fieldStyle?: StyleProp<ViewStyle>;
  triggerStyle?: StyleProp<ViewStyle>;
  valueStyle?: StyleProp<TextStyle>;
  placeholder?: string;
  placeholderColor?: string;
  disabled?: boolean;
  /** Color de acento (día seleccionado). */
  accentColor?: string;
  textColor?: string;
};

function formatDisplay(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function parseIsoOrDefault(iso: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  // Default: 25 años atrás (edad típica al registrar).
  const now = new Date();
  return new Date(now.getFullYear() - 25, now.getMonth(), now.getDate());
}

export function BirthDateField({
  value,
  onChange,
  label = 'Fecha de cumpleaños',
  labelStyle,
  fieldStyle,
  triggerStyle,
  valueStyle,
  placeholder = 'Toca para elegir en el calendario',
  placeholderColor = '#9CA3AF',
  disabled = false,
  accentColor = '#1E5A9E',
  textColor = '#1A1A1A',
}: BirthDateFieldProps) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState(() => parseIsoOrDefault(value));
  const todayYmd = useMemo(() => ymdLocal(new Date()), []);
  const cells = useMemo(() => daysInMonthGridLocal(anchor), [anchor]);
  const monthLabel = anchor.toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric',
  });

  function openPicker() {
    if (disabled) return;
    setAnchor(parseIsoOrDefault(value));
    setOpen(true);
  }

  function selectDay(date: string) {
    if (date > todayYmd) return;
    onChange(date);
    setOpen(false);
  }

  const display = formatDisplay(value);

  return (
    <View style={fieldStyle}>
      {label ? <Text style={labelStyle}>{label}</Text> : null}
      <Pressable
        onPress={openPicker}
        disabled={disabled}
        style={[styles.trigger, triggerStyle]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text
          style={[
            styles.value,
            { color: display ? textColor : placeholderColor },
            valueStyle,
          ]}
        >
          {display || placeholder}
        </Text>
        <AppIcon icon={Icons.calendarDay} size={20} color={accentColor} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.sheetTitle, { color: textColor }]}>
              Fecha de cumpleaños
            </Text>

            <View style={styles.monthRow}>
              <Pressable
                hitSlop={10}
                onPress={() =>
                  setAnchor(
                    new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1),
                  )
                }
                style={styles.navBtn}
              >
                <Text style={{ fontWeight: '700', color: textColor }}>←</Text>
              </Pressable>
              <Text
                style={[
                  styles.monthLabel,
                  { color: textColor },
                ]}
              >
                {monthLabel}
              </Text>
              <Pressable
                hitSlop={10}
                onPress={() =>
                  setAnchor(
                    new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1),
                  )
                }
                style={styles.navBtn}
              >
                <Text style={{ fontWeight: '700', color: textColor }}>→</Text>
              </Pressable>
            </View>

            <View style={styles.yearRow}>
              <Pressable
                onPress={() =>
                  setAnchor(
                    new Date(anchor.getFullYear() - 1, anchor.getMonth(), 1),
                  )
                }
                style={styles.yearBtn}
              >
                <Text style={{ color: accentColor, fontWeight: '700' }}>
                  − Año
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const next = new Date(
                    anchor.getFullYear() + 1,
                    anchor.getMonth(),
                    1,
                  );
                  const now = new Date();
                  if (
                    next.getFullYear() > now.getFullYear() ||
                    (next.getFullYear() === now.getFullYear() &&
                      next.getMonth() > now.getMonth())
                  ) {
                    return;
                  }
                  setAnchor(next);
                }}
                style={styles.yearBtn}
              >
                <Text style={{ color: accentColor, fontWeight: '700' }}>
                  + Año
                </Text>
              </Pressable>
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
                const selected = value === cell.date;
                const future = cell.date > todayYmd;
                return (
                  <View key={cell.date} style={styles.dayCell}>
                    <Pressable
                      disabled={future}
                      onPress={() => selectDay(cell.date!)}
                      style={[
                        styles.dayBtn,
                        selected && {
                          backgroundColor: accentColor,
                          borderColor: accentColor,
                        },
                        future && styles.dayDisabled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          {
                            color: selected
                              ? '#FFFFFF'
                              : future
                                ? '#D1D5DB'
                                : textColor,
                          },
                        ]}
                      >
                        {cell.day}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>

            <View style={styles.footer}>
              {value ? (
                <Pressable
                  onPress={() => {
                    onChange('');
                    setOpen(false);
                  }}
                >
                  <Text style={{ color: '#6B7280', fontWeight: '600' }}>
                    Limpiar
                  </Text>
                </Pressable>
              ) : (
                <View />
              )}
              <Pressable onPress={() => setOpen(false)}>
                <Text style={{ color: accentColor, fontWeight: '700' }}>
                  Cerrar
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  value: {
    flex: 1,
    fontSize: 15,
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
  yearRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  yearBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
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
  dayDisabled: { backgroundColor: '#F9FAFB' },
  dayText: { fontSize: 13, fontWeight: '700' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
});
