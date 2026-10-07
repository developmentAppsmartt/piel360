import { useEffect, useState } from 'react';
import {
  Image,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { OFFLINE_LOGO_URI } from '../assets/offlineLogo';
import { useBranding } from '../context/BrandingContext';
import type { DepletedPlanInfo } from '../types/auth';

const LOGO = { uri: OFFLINE_LOGO_URI };
const PLANS_WEB_URL = 'https://piel360.com/doctor/planes';
const SUPPORT_EMAIL = 'soporte@piel360.com';
/** Tope al tamaño de letra del sistema: sin él la tarjeta crece más que la pantalla. */
const MAX_FONT_SCALE = 1.15;

/** Combinaciones usuario + planes agotados ya avisadas mientras la app siga
 * abierta: si se agota otro plan, el aviso vuelve a aparecer. */
const shownKeys = new Set<string>();

function GaugeIcon({ color, size = 34 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 16a8 8 0 1 1 16 0"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Line x1={12} y1={16} x2={7.5} y2={11.5} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx={12} cy={16} r={1.6} fill={color} />
    </Svg>
  );
}

function BatteryLowIcon({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={2.5} y={7} width={16} height={10} rx={2} stroke={color} strokeWidth={1.8} />
      <Line x1={21.5} y1={10.5} x2={21.5} y2={13.5} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1={6} y1={10.5} x2={6} y2={13.5} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function CalendarXIcon({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3.5} y={5} width={17} height={15} rx={2} stroke={color} strokeWidth={1.8} />
      <Line x1={3.5} y1={9.5} x2={20.5} y2={9.5} stroke={color} strokeWidth={1.8} />
      <Line x1={8} y1={3} x2={8} y2={6.5} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1={16} y1={3} x2={16} y2={6.5} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1={9.5} y1={12.5} x2={14.5} y2={17.5} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1={14.5} y1={12.5} x2={9.5} y2={17.5} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function DepletedCreditsModal({
  userId,
  depletedPlans,
}: {
  userId: string;
  depletedPlans: DepletedPlanInfo[];
}) {
  const branding = useBranding();
  const [visible, setVisible] = useState(false);
  const several = depletedPlans.length > 1;
  const hasCredits = depletedPlans.some((plan) => plan.reason !== 'expired');
  const hasExpired = depletedPlans.some((plan) => plan.reason === 'expired');
  const copy =
    hasCredits && hasExpired
      ? {
          title: '¡Algunos de sus planes se consumieron!',
          section: 'PLANES SIN CRÉDITOS O VENCIDOS',
          body: 'Algunos planes ya usaron todos sus análisis y otros terminaron su vigencia. Sus demás planes siguen activos; para seguir usando los consumidos, renuévelos o adquiera más créditos.',
          cta: 'Ver planes',
        }
      : hasExpired
        ? {
            title: several ? '¡Sus planes han finalizado!' : '¡Su plan ha finalizado!',
            section: several ? 'PLANES VENCIDOS' : 'PLAN VENCIDO',
            body: 'Terminó su vigencia. Sus demás planes siguen activos; los datos asociados se conservarán hasta la fecha indicada. Para seguir usándolo, renuévelo.',
            cta: several ? 'Renovar planes' : 'Renovar plan',
          }
        : {
            title: several
              ? '¡Sus planes se quedaron sin créditos!'
              : '¡Su plan se quedó sin créditos!',
            section: several ? 'PLANES SIN CRÉDITOS' : 'PLAN SIN CRÉDITOS',
            body: 'Ya utilizó todos los análisis incluidos. Sus pacientes, configuraciones y reportes se conservan; para seguir realizando análisis adquiera más créditos.',
            cta: 'Adquirir más créditos',
          };
  const key = `${userId}:${depletedPlans
    .map((plan) => plan.subscriptionId)
    .sort()
    .join(',')}`;

  useEffect(() => {
    if (shownKeys.has(key)) return;
    shownKeys.add(key);
    setVisible(true);
  }, [key]);

  const close = () => setVisible(false);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
            onPress={close}
            style={styles.closeButton}
            hitSlop={12}
          >
            <Text style={[styles.closeText, { color: branding.colors.iconMuted }]}>✕</Text>
          </Pressable>

          <View style={styles.content}>
            <View style={styles.header}>
              <Image source={LOGO} resizeMode="contain" style={styles.logo} />
              <View style={[styles.iconWrap, { backgroundColor: `${branding.colors.icon}1A` }]}>
                <GaugeIcon color={branding.colors.icon} size={22} />
              </View>
            </View>

            <Text
              style={[styles.title, { color: branding.colors.primaryText }]}
              maxFontSizeMultiplier={MAX_FONT_SCALE}
            >
              {copy.title}
            </Text>

            <Text style={styles.paragraph} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {copy.body}
            </Text>

            <View style={styles.depletedBox}>
              <Text style={styles.depletedEyebrow} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {copy.section}
              </Text>
              {depletedPlans.map((plan) => {
                const expired = plan.reason === 'expired';
                return (
                  <View key={plan.subscriptionId} style={styles.depletedRow}>
                    <View style={styles.depletedIcon}>
                      {expired ? (
                        <CalendarXIcon color="#B45309" size={20} />
                      ) : (
                        <BatteryLowIcon color="#B45309" size={20} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.nameRow}>
                        <Text
                          style={styles.depletedName}
                          numberOfLines={1}
                          maxFontSizeMultiplier={MAX_FONT_SCALE}
                        >
                          {plan.planName}
                        </Text>
                        <View style={styles.badge}>
                          <Text style={styles.badgeText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                            {expired ? 'Vencido' : 'Sin créditos'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.depletedMeta} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                        <Text style={styles.depletedZero}>{plan.remaining ?? 0}</Text> de{' '}
                        {plan.analysisLimit} análisis {expired ? 'sin usar' : 'disponibles'}
                      </Text>
                      {plan.endsAt ? (
                        <Text style={styles.depletedEnds} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                          {expired ? 'Venció' : 'Vigente hasta'} {formatDate(plan.endsAt)}
                          {expired && plan.dataDeletionAt ? (
                            <Text style={styles.deletion}>
                              {' · '}datos hasta {formatDate(plan.dataDeletionAt)}
                            </Text>
                          ) : null}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                close();
                void Linking.openURL(PLANS_WEB_URL);
              }}
              style={({ pressed }) => [
                styles.button,
                {
              backgroundColor: pressed
                ? branding.colors.buttonHover
                : branding.colors.button,
              opacity: pressed ? 0.85 : 1,
            },
              ]}
            >
              <Text style={[styles.buttonText, { color: branding.colors.buttonText }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {copy.cta} →
              </Text>
            </Pressable>

            <Text style={styles.help} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              ¿Necesita ayuda? Por favor{' '}
              <Text
                style={[styles.link, { color: branding.colors.primaryText }]}
                onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
              >
                contacte con nosotros
              </Text>
              .
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 14,
    zIndex: 2,
  },
  closeText: {
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    gap: 9,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 52,
    height: 46,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  paragraph: {
    alignSelf: 'stretch',
    fontSize: 13,
    lineHeight: 19,
    color: '#1F2937',
  },
  depletedBox: {
    alignSelf: 'stretch',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  depletedEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: '#92400E',
  },
  depletedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  depletedIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  depletedName: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  depletedMeta: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 1,
  },
  depletedZero: {
    fontWeight: '800',
    color: '#92400E',
  },
  depletedEnds: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  badge: {
    borderRadius: 999,
    backgroundColor: '#FDE68A',
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#78350F',
  },
  deletion: {
    fontWeight: '600',
    color: '#B91C1C',
  },
  button: {
    alignSelf: 'stretch',
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  help: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  link: {
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});
