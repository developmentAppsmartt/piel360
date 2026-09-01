import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { AppIcon } from '../AppIcon';
import { Icons } from '../icons';
import { useBranding } from '../../context/BrandingContext';
import {
  geocodeService,
  type PlaceSuggestion,
} from '../../services/geocode.service';
import { LocationMap } from './LocationMap';

export type LocationPickerValue = {
  address: string;
  lat: number | null;
  lng: number | null;
  city?: string;
  country?: string;
  zip?: string;
};

type LocationPickerProps = {
  value: LocationPickerValue;
  onChange: (next: LocationPickerValue) => void;
  disabled?: boolean;
  /** Ciudad / país / CP (doctor). */
  showAdminFields?: boolean;
  variant?: 'form' | 'auth';
  /** Si false, oculta el título (el padre ya lo muestra). */
  showLabel?: boolean;
};

/**
 * Mismo concepto que el CRM web (`AddressLocationPicker`):
 * búsqueda Nominatim + GPS + mapa + reverse geocode.
 * El mapa nativo vive en `LocationMap.native` (no se carga en web).
 */
export function LocationPicker({
  value,
  onChange,
  disabled = false,
  showAdminFields = false,
  variant = 'form',
  showLabel = true,
}: LocationPickerProps) {
  const branding = useBranding();
  const styles = useMemo(
    () => createStyles(branding.colors, variant),
    [branding.colors, variant],
  );

  const [query, setQuery] = useState(value.address);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const suppressSearch = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const searchInputRef = useRef<TextInput>(null);
  const blurCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function closeSuggestions() {
    if (blurCloseTimerRef.current) {
      clearTimeout(blurCloseTimerRef.current);
      blurCloseTimerRef.current = null;
    }
    setSearchOpen(false);
    searchInputRef.current?.blur();
  }

  function scheduleCloseSuggestions() {
    if (blurCloseTimerRef.current) {
      clearTimeout(blurCloseTimerRef.current);
    }
    blurCloseTimerRef.current = setTimeout(() => {
      blurCloseTimerRef.current = null;
      setSearchOpen(false);
    }, 180);
  }

  useEffect(
    () => () => {
      if (blurCloseTimerRef.current) {
        clearTimeout(blurCloseTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (value.address !== query && !searchOpen) {
      setQuery(value.address);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.address]);

  useEffect(() => {
    if (suppressSearch.current) {
      suppressSearch.current = false;
      return;
    }
    const q = query.trim();
    if (q.length < 3 || disabled) {
      setSuggestions([]);
      setSearchOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setSearchLoading(true);
      setError(null);
      try {
        const list = await geocodeService.autocomplete(q, controller.signal);
        setSuggestions(list);
        setSearchOpen(true);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setSuggestions([]);
          setError(
            err instanceof Error
              ? err.message
              : 'No se pudo buscar la dirección',
          );
        }
      } finally {
        setSearchLoading(false);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [query, disabled]);

  async function applyCoords(lat: number, lng: number) {
    closeSuggestions();
    setGeoLoading(true);
    setError(null);
    try {
      const resolved = await geocodeService.reverseGeocode(lat, lng);
      suppressSearch.current = true;
      setQuery(resolved.address);
      setSuggestions([]);
      setSearchOpen(false);
      onChange({
        address: resolved.address,
        lat: resolved.lat,
        lng: resolved.lng,
        city: resolved.city ?? '',
        country: resolved.country ?? 'CO',
        zip: resolved.zip ?? '',
      });
    } catch (err) {
      onChange({
        ...value,
        address: value.address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        lat,
        lng,
        country: value.country || 'CO',
      });
      setError(
        err instanceof Error
          ? err.message
          : 'Ubicación marcada; no se pudo resolver la dirección',
      );
    } finally {
      setGeoLoading(false);
    }
  }

  function selectSuggestion(item: PlaceSuggestion) {
    if (blurCloseTimerRef.current) {
      clearTimeout(blurCloseTimerRef.current);
      blurCloseTimerRef.current = null;
    }
    suppressSearch.current = true;
    setQuery(item.description);
    setSuggestions([]);
    setSearchOpen(false);
    setError(null);
    onChange({
      address: item.description,
      lat: item.lat,
      lng: item.lng,
      city: item.city ?? '',
      country: item.country ?? 'CO',
      zip: item.zip ?? '',
    });
  }

  async function useCurrentLocation() {
    if (disabled) return;
    setError(null);
    setGeoLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permiso de ubicación denegado. Busca o marca el mapa.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      await applyCoords(pos.coords.latitude, pos.coords.longitude);
    } catch {
      setError(
        'No se pudo obtener tu ubicación. Busca la dirección o marca el mapa.',
      );
    } finally {
      setGeoLoading(false);
    }
  }

  const hasPin =
    typeof value.lat === 'number' &&
    typeof value.lng === 'number' &&
    Number.isFinite(value.lat) &&
    Number.isFinite(value.lng);

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          {showLabel ? <Text style={styles.label}>Ubicación</Text> : null}
          <Text style={styles.subHint}>
            Busca la dirección exacta o usa tu ubicación actual.
          </Text>
        </View>
        <Pressable
          onPress={() => {
            closeSuggestions();
            void useCurrentLocation();
          }}
          disabled={disabled || geoLoading}
          style={styles.gpsBtn}
        >
          {geoLoading ? (
            <ActivityIndicator size="small" color={branding.colors.primary} />
          ) : (
            <>
              <AppIcon
                icon={Icons.mapMarker}
                size={16}
                color={branding.colors.primary}
              />
              <Text style={styles.gpsText}>Mi ubicación</Text>
            </>
          )}
        </Pressable>
      </View>

      <View style={styles.searchBlock}>
        <Text style={styles.subLabel}>Buscar dirección exacta</Text>
        <View style={styles.searchWrap}>
          <AppIcon icon={Icons.search} size={18} color={branding.colors.muted} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            value={query}
            onChangeText={(t) => {
              setQuery(t);
              setSearchOpen(true);
              onChange({ ...value, address: t });
            }}
            onFocus={() => {
              if (suggestions.length > 0) {
                setSearchOpen(true);
              }
            }}
            onBlur={scheduleCloseSuggestions}
            placeholder="Ej. Calle 100 #19-54, Bogotá"
            placeholderTextColor={styles.placeholder.color}
            editable={!disabled}
            autoCorrect={false}
          />
          {searchLoading ? (
            <ActivityIndicator size="small" color={branding.colors.primary} />
          ) : null}
        </View>

        {searchOpen && suggestions.length > 0 ? (
          <ScrollView
            style={styles.suggestions}
            contentContainerStyle={styles.suggestionsContent}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
            // Evita que el ScrollView padre robe el scroll (web)
            {...(Platform.OS === 'web'
              ? ({
                  // @ts-expect-error prop DOM en RN-web
                  onWheel: (e: { stopPropagation: () => void }) =>
                    e.stopPropagation(),
                } as object)
              : {})}
          >
            {suggestions.map((s) => (
              <Pressable
                key={s.id}
                style={styles.suggestionRow}
                onPress={() => selectSuggestion(s)}
                disabled={disabled}
              >
                <AppIcon
                  icon={Icons.mapMarker}
                  size={16}
                  color={branding.colors.muted}
                />
                <Text style={styles.suggestionText}>{s.description}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </View>

      <View
        onTouchStart={() => {
          closeSuggestions();
        }}
      >
        <LocationMap
          lat={value.lat}
          lng={value.lng}
          disabled={disabled}
          style={styles.map}
          onPick={(lat, lng) => void applyCoords(lat, lng)}
        />
      </View>

      {hasPin ? (
        <Text style={styles.coords}>
          {value.address || 'Ubicación marcada'} · Lat {value.lat!.toFixed(5)},
          Lng {value.lng!.toFixed(5)}
        </Text>
      ) : (
        <Text style={styles.hint}>
          Busca, usa GPS o toca el mapa para fijar la ubicación.
        </Text>
      )}

      {showAdminFields ? (
        <View style={styles.adminBlock}>
          <View style={styles.row}>
            <View style={[styles.field, styles.half]}>
              <Text style={styles.subLabel}>Ciudad</Text>
              <TextInput
                style={styles.input}
                value={value.city ?? ''}
                onChangeText={(t) => onChange({ ...value, city: t })}
                editable={!disabled}
                placeholderTextColor={styles.placeholder.color}
              />
            </View>
            <View style={[styles.field, styles.half]}>
              <Text style={styles.subLabel}>País</Text>
              <TextInput
                style={styles.input}
                value={value.country ?? ''}
                onChangeText={(t) => onChange({ ...value, country: t })}
                editable={!disabled}
                placeholderTextColor={styles.placeholder.color}
              />
            </View>
          </View>
          <View style={styles.field}>
            <Text style={styles.subLabel}>Código postal</Text>
            <TextInput
              style={styles.input}
              value={value.zip ?? ''}
              onChangeText={(t) => onChange({ ...value, zip: t })}
              editable={!disabled}
              placeholderTextColor={styles.placeholder.color}
            />
          </View>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function createStyles(
  colors: {
    primary: string;
    muted: string;
    text: string;
  },
  variant: 'form' | 'auth',
) {
  const isAuth = variant === 'auth';
  const inputBg = isAuth ? '#FFFFFF' : '#F9FAFB';
  const border = '#E5E7EB';
  const textColor = colors.text;

  return StyleSheet.create({
    wrap: {
      gap: 10,
      zIndex: 2,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8,
    },
    headerText: {
      flex: 1,
      gap: 2,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: isAuth ? '#374151' : colors.muted,
    },
    subHint: {
      fontSize: 12,
      color: colors.muted,
      lineHeight: 16,
    },
    gpsBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: border,
      backgroundColor: '#FFFFFF',
    },
    gpsText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
    },
    field: {
      gap: 6,
    },
    searchBlock: {
      gap: 6,
      zIndex: 30,
      elevation: 30,
      ...(Platform.OS === 'web' ? ({ position: 'relative' } as object) : {}),
    },
    subLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.muted,
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: inputBg,
      borderWidth: 1,
      borderColor: border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: Platform.OS === 'ios' ? 12 : 4,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: textColor,
      paddingVertical: 8,
    },
    suggestions: {
      maxHeight: 200,
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: border,
      ...(Platform.OS === 'web'
        ? ({
            position: 'absolute',
            left: 0,
            right: 0,
            top: '100%',
            marginTop: 4,
            zIndex: 50,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          } as object)
        : {
            marginTop: 4,
          }),
    },
    suggestionsContent: {
      paddingVertical: 4,
    },
    suggestionRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: '#E5E7EB',
    },
    suggestionText: {
      flex: 1,
      fontSize: 14,
      color: textColor,
      lineHeight: 20,
    },
    map: {
      height: 220,
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: border,
      zIndex: 1,
    },
    hint: {
      fontSize: 12,
      color: colors.muted,
    },
    coords: {
      fontSize: 12,
      color: colors.muted,
      lineHeight: 16,
    },
    adminBlock: {
      gap: 10,
      marginTop: 4,
    },
    row: {
      flexDirection: 'row',
      gap: 10,
    },
    half: {
      flex: 1,
    },
    input: {
      backgroundColor: inputBg,
      borderWidth: 1,
      borderColor: border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: textColor,
    },
    placeholder: {
      color: '#9CA3AF',
    },
    error: {
      fontSize: 13,
      color: '#B91C1C',
    },
  });
}
