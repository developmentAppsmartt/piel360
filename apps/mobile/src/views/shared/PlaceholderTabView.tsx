import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useBranding } from '../../context/BrandingContext';
import { AppModuleChrome } from './AppModuleChrome';

type PlaceholderTabViewProps = {
  title: string;
  description: string;
  onOpenMessages?: () => void;
  onOpenProfile?: () => void;
};

export function PlaceholderTabView({
  title,
  description,
  onOpenMessages,
  onOpenProfile,
}: PlaceholderTabViewProps) {
  const branding = useBranding();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: '#F3F4F6',
        },
        body: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 28,
        },
        title: {
          fontSize: 22,
          fontWeight: '700',
          color: branding.colors.text,
          marginBottom: 8,
        },
        description: {
          fontSize: 15,
          color: branding.colors.muted,
          textAlign: 'center',
          lineHeight: 22,
        },
      }),
    [branding.colors.muted, branding.colors.text],
  );

  return (
    <View style={styles.container}>
      <AppModuleChrome
        onOpenMessages={onOpenMessages}
        onOpenProfile={onOpenProfile}
      >
        <View style={styles.body}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
      </AppModuleChrome>
    </View>
  );
}
