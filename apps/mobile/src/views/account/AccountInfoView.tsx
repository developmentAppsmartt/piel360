import { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useBranding } from '../../context/BrandingContext';
import { AppModuleChrome } from '../shared/AppModuleChrome';
import { createAccountInfoStyles } from './styles/accountInfo.styles';

type AccountInfoViewProps = {
  title: string;
  body: string;
  onBack: () => void;
  onOpenMessages?: () => void;
  onOpenProfile?: () => void;
};

export function AccountInfoView({
  title,
  body,
  onBack,
  onOpenMessages,
  onOpenProfile,
}: AccountInfoViewProps) {
  const branding = useBranding();
  const styles = useMemo(
    () => createAccountInfoStyles(branding.colors),
    [branding.colors],
  );

  return (
    <View style={styles.screen}>
      <AppModuleChrome
        showBack
        onBack={onBack}
        onOpenMessages={onOpenMessages}
        onOpenProfile={onOpenProfile}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text
            style={{
              fontSize: 20,
              fontWeight: '700',
              color: branding.colors.text,
              marginBottom: 12,
            }}
          >
            {title}
          </Text>
          <Text style={styles.body}>{body}</Text>
        </ScrollView>
      </AppModuleChrome>
    </View>
  );
}
