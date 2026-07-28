import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../components/AppIcon';
import { Icons } from '../../components/icons';
import { useBranding } from '../../context/BrandingContext';
import { createAccountInfoStyles } from './styles/accountInfo.styles';

type AccountInfoViewProps = {
  title: string;
  body: string;
  onBack: () => void;
};

export function AccountInfoView({ title, body, onBack }: AccountInfoViewProps) {
  const insets = useSafeAreaInsets();
  const branding = useBranding();
  const styles = useMemo(
    () => createAccountInfoStyles(branding.colors),
    [branding.colors],
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <Pressable
          onPress={onBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <AppIcon icon={Icons.back} size={28} color={branding.colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerSide} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.body}>{body}</Text>
      </ScrollView>
    </View>
  );
}
