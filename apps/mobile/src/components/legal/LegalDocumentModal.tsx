import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../components/AppIcon';
import { Icons } from '../../components/icons';
import { useBranding } from '../../context/BrandingContext';
import {
  getLegalDocument,
  type LegalDocId,
} from '../../data/legal/documents';
import { ComplianceBadges } from './ComplianceBadges';

type LegalDocumentModalProps = {
  docId: LegalDocId | null;
  visible: boolean;
  onClose: () => void;
};

export function LegalDocumentModal({
  docId,
  visible,
  onClose,
}: LegalDocumentModalProps) {
  const branding = useBranding();
  const insets = useSafeAreaInsets();
  const doc = docId ? getLegalDocument(docId) : null;
  const primary = branding.colors.primary;
  const primaryDark = branding.colors.primaryDark;

  return (
    <Modal
      visible={visible && !!doc}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      {doc ? (
        <View
          style={[
            styles.screen,
            {
              paddingTop: Math.max(insets.top, 12),
              paddingBottom: Math.max(insets.bottom, 16),
              backgroundColor: '#FFFFFF',
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerTextCol}>
              <Text style={[styles.title, { color: primaryDark }]}>
                {doc.title}
              </Text>
              <Text style={styles.updated}>
                Última actualización: {doc.updatedAt}
              </Text>
            </View>
            <Pressable
              style={[styles.closeBtn, { backgroundColor: `${primary}18` }]}
              onPress={onClose}
              accessibilityLabel="Cerrar"
            >
              <AppIcon icon={Icons.close} size={18} color={primary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator
          >
            {doc.intro ? (
              <Text style={styles.intro}>{doc.intro}</Text>
            ) : null}

            {doc.sections.map((section) => (
              <View key={section.heading ?? section.paragraphs[0]} style={styles.section}>
                {section.heading ? (
                  <Text style={[styles.heading, { color: primaryDark }]}>
                    {section.heading}
                  </Text>
                ) : null}
                {section.paragraphs.map((p) => (
                  <Text key={p.slice(0, 48)} style={styles.paragraph}>
                    {p}
                  </Text>
                ))}
              </View>
            ))}

            <View style={styles.badgesBlock}>
              <Text style={[styles.heading, { color: primaryDark }]}>
                Cumplimiento normativo
              </Text>
              <ComplianceBadges variant="light" />
            </View>
          </ScrollView>

          <Pressable
            style={[styles.doneBtn, { backgroundColor: primary }]}
            onPress={onClose}
          >
            <Text style={styles.doneBtnText}>Cerrar</Text>
          </Pressable>
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  headerTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
  },
  updated: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 28,
    gap: 16,
  },
  intro: {
    fontSize: 14,
    lineHeight: 21,
    color: '#374151',
    fontWeight: '500',
  },
  section: {
    gap: 8,
  },
  heading: {
    fontSize: 15,
    fontWeight: '800',
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 21,
    color: '#4B5563',
  },
  badgesBlock: {
    gap: 10,
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  doneBtn: {
    marginHorizontal: 16,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
