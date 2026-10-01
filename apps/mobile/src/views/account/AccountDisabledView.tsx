import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line } from 'react-native-svg';
import { OFFLINE_LOGO_URI } from '../../assets/offlineLogo';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';

const LOGO = { uri: OFFLINE_LOGO_URI };
const SUPPORT_EMAIL = 'soporte@piel360.com';

function BanIcon({ color, size = 26 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={2} />
      <Line
        x1={5.6}
        y1={5.6}
        x2={18.4}
        y2={18.4}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Pantalla única para cuentas (o empresas) deshabilitadas por un admin. */
export function AccountDisabledView() {
  const branding = useBranding();
  const insets = useSafeAreaInsets();
  const { accountStatus, refreshAccountStatus, logout } = useAuth();
  const [checking, setChecking] = useState(false);
  const primary = branding.colors.primary;
  const byOrganization = accountStatus?.disabledScope === 'organization';
  const since = formatDate(accountStatus?.disabledAt ?? null);

  const recheck = async () => {
    setChecking(true);
    await refreshAccountStatus();
    setChecking(false);
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#FDECEF', '#F7FAFE']}
        style={[styles.hero, { paddingTop: insets.top + 28 }]}
      >
        <View style={styles.illustration}>
          <Image
            source={LOGO}
            accessibilityLabel={branding.appName}
            resizeMode="contain"
            style={styles.logo}
          />
          <View style={styles.badge}>
            <BanIcon color="#E11D48" />
          </View>
        </View>
        <Text style={[styles.title, { color: branding.colors.primaryDark }]}>
          {byOrganization
            ? 'Tu empresa está deshabilitada'
            : 'Tu cuenta está deshabilitada'}
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.sheet}
        contentContainerStyle={[
          styles.sheetContent,
          { paddingBottom: insets.bottom + 28 },
        ]}
      >
        <Text style={styles.message}>
          {byOrganization
            ? 'El administrador de Piel 360 deshabilitó la cuenta de la empresa a la que perteneces.'
            : 'El administrador de Piel 360 deshabilitó tu cuenta.'}
          {since ? ` Deshabilitada desde el ${since}.` : ''}
        </Text>

        <View style={styles.reasonBox}>
          <Text style={styles.reasonLabel}>MOTIVO</Text>
          <Text style={styles.reasonText}>
            {accountStatus?.disabledReason?.trim() ||
              'No se registró una observación.'}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.buttonText}>Contactar a soporte</Text>
        </Pressable>

        <View style={styles.row}>
          <Pressable
            accessibilityRole="button"
            onPress={() => void recheck()}
            disabled={checking}
            style={styles.linkButton}
          >
            {checking ? (
              <ActivityIndicator color={primary} />
            ) : (
              <Text style={[styles.linkText, { color: primary }]}>
                Volver a verificar
              </Text>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => void logout()}
            style={styles.linkButton}
          >
            <Text style={[styles.linkText, { color: '#6B7280' }]}>
              Cerrar sesión
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F7FAFE',
  },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 20,
  },
  illustration: {
    width: 160,
    height: 148,
  },
  logo: {
    width: 160,
    height: 148,
  },
  badge: {
    position: 'absolute',
    right: -6,
    bottom: 2,
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#FECDD3',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  sheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  sheetContent: {
    paddingHorizontal: 28,
    paddingTop: 28,
    gap: 16,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: '#1F3B63',
    textAlign: 'center',
  },
  reasonBox: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FFE4E6',
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 6,
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#BE123C',
  },
  reasonText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#111827',
  },
  button: {
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  linkButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    minWidth: 120,
  },
  linkText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
