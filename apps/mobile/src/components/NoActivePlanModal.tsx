import { useEffect, useState } from 'react';
import {
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { OFFLINE_LOGO_URI } from '../assets/offlineLogo';
import { useBranding } from '../context/BrandingContext';
import {
  EXPIRED_PLAN_DATA_RETENTION_DAYS,
  type ExpiredPlanInfo,
} from '../types/auth';

const LOGO = { uri: OFFLINE_LOGO_URI };
const PLANS_WEB_URL = 'https://piel360.com/doctor/planes';
const SUPPORT_EMAIL = 'soporte@piel360.com';

/** Una vez por usuario mientras la app siga abierta. */
const shownForUsers = new Set<string>();

function TimerIcon({ color, size = 34 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={13} r={8} stroke={color} strokeWidth={1.8} />
      <Line x1={10} y1={2.5} x2={14} y2={2.5} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M12 9v4h3" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
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

export function NoActivePlanModal({
  userId,
  expiredPlans,
}: {
  userId: string;
  expiredPlans: ExpiredPlanInfo[];
}) {
  const branding = useBranding();
  const primary = branding.colors.primary;
  const [visible, setVisible] = useState(false);
  const expired = expiredPlans.length > 0;

  useEffect(() => {
    if (shownForUsers.has(userId)) return;
    shownForUsers.add(userId);
    setVisible(true);
  }, [userId]);

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
            <Text style={[styles.closeText, { color: branding.colors.primaryDark }]}>✕</Text>
          </Pressable>

          <ScrollView contentContainerStyle={styles.content}>
            <Image source={LOGO} resizeMode="contain" style={styles.logo} />
            <View style={[styles.iconWrap, { backgroundColor: `${primary}1A` }]}>
              <TimerIcon color={branding.colors.primaryDark} />
            </View>

            <Text style={[styles.title, { color: branding.colors.primaryDark }]}>
              {expired ? '¡Su suscripción ha finalizado!' : 'No tiene un plan activo'}
            </Text>

            {expired ? (
              <>
                <Text style={styles.paragraph}>
                  ¡Esperamos que haya disfrutado mucho usando{' '}
                  {expiredPlans.map((plan, index) => (
                    <Text key={plan.planName}>
                      {index === 0 ? '' : index === expiredPlans.length - 1 ? ' y ' : ', '}
                      <Text style={[styles.strong, { color: primary }]}>{plan.planName}</Text>
                    </Text>
                  ))}
                  !
                </Text>
                <Text style={styles.paragraph}>
                  Su suscripción ha caducado. Guarde todas sus configuraciones y siga
                  usando la plataforma extendiendo su suscripción.
                </Text>
                <Text style={styles.paragraph}>
                  Si no realiza ninguna acción, sus datos analíticos se eliminarán
                  después de {EXPIRED_PLAN_DATA_RETENTION_DAYS} días en:
                </Text>
                <View style={[styles.deletionBox, { backgroundColor: `${primary}0F` }]}>
                  {expiredPlans.map((plan, index) => (
                    <View key={plan.planName} style={styles.deletionRow}>
                      <View style={[styles.stepBadge, { backgroundColor: primary }]}>
                        <Text style={styles.stepText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.deletionText}>
                        {plan.planName}:{' '}
                        <Text style={styles.strong}>{formatDate(plan.dataDeletionAt)}</Text>
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <Text style={styles.paragraph}>
                Para usar pacientes, agenda, chat y el resto de módulos necesita un
                plan vigente. Mientras tanto puede consultar el inicio, sus reportes,
                su perfil y soporte.
              </Text>
            )}

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                close();
                void Linking.openURL(PLANS_WEB_URL);
              }}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.buttonText}>
                {expired ? 'Extender mi suscripción →' : 'Ver planes →'}
              </Text>
            </Pressable>

            <Text style={styles.help}>
              ¿Necesita ayuda? Por favor{' '}
              <Text
                style={[styles.link, { color: primary }]}
                onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
              >
                contacte con nosotros
              </Text>
              .
            </Text>
          </ScrollView>
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
    maxHeight: '90%',
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 14,
    right: 16,
    zIndex: 2,
  },
  closeText: {
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 22,
    gap: 12,
  },
  logo: {
    width: 110,
    height: 100,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
  },
  paragraph: {
    alignSelf: 'stretch',
    fontSize: 14,
    lineHeight: 21,
    color: '#1F2937',
  },
  strong: {
    fontWeight: '700',
  },
  deletionBox: {
    alignSelf: 'stretch',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  deletionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  deletionText: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  button: {
    alignSelf: 'stretch',
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
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
