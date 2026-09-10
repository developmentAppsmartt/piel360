import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../../../../components/AppIcon';
import { Icons } from '../../../../components/icons';
import { useBranding } from '../../../../context/BrandingContext';
import {
  BODY_PARTS_INFO,
  bodyModelGenderFromPatient,
  focusPointForRegion,
} from '../../../../data/bodyRegions';
import { BodySelector3D } from '../../../analyses/skiniver-flow/BodySelector3D';

type BodyRegionViewerProps = {
  visible: boolean;
  bodyRegion: string | null;
  label: string | null;
  gender?: string | null;
  xCoord?: number | null;
  yCoord?: number | null;
  zCoord?: number | null;
  onClose: () => void;
};

export function BodyRegionViewer({
  visible,
  bodyRegion,
  label,
  gender,
  xCoord,
  yCoord,
  zCoord,
  onClose,
}: BodyRegionViewerProps) {
  const branding = useBranding();
  // Mismo criterio que el historial 3D del CRM: hombre salvo que el
  // paciente esté marcado explícitamente como mujer.
  const modelGender = bodyModelGenderFromPatient(gender) ?? 'male';
  const focusPoint = useMemo(
    () => focusPointForRegion(bodyRegion, { x: xCoord, y: yCoord, z: zCoord }),
    [bodyRegion, xCoord, yCoord, zCoord],
  );
  const regionLabel =
    label ??
    (bodyRegion ? BODY_PARTS_INFO[bodyRegion]?.label ?? bodyRegion : null);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Zona del cuerpo</Text>
            <Text style={styles.subtitle}>
              {regionLabel
                ? `Ubicación del análisis: ${regionLabel}`
                : 'Punto marcado en la figura humana'}
            </Text>
          </View>
          <Pressable
            style={styles.closeBtn}
            onPress={onClose}
            accessibilityLabel="Cerrar figura"
          >
            <AppIcon icon={Icons.close} size={18} color={branding.colors.muted} />
          </Pressable>
        </View>

        <View style={styles.model}>
          <BodySelector3D
            initialGender={modelGender}
            lockGender
            focusPoint={focusPoint}
            focusRegion={bodyRegion}
            primaryColor={branding.colors.primary}
          />
        </View>

        <Pressable
          style={[styles.closeAction, { backgroundColor: branding.colors.primary }]}
          onPress={onClose}
        >
          <Text style={styles.closeActionText}>Cerrar</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  headerText: { flex: 1, gap: 4 },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  model: { flex: 1, minHeight: 280 },
  closeAction: {
    marginTop: 12,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
