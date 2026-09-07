// @@iconify-code-gen
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNoticeHost } from './src/components/notices/AppNoticeHost';
import './src/components/notices/patchAlert';
import { AuthProvider } from './src/context/AuthContext';
import { BrandingProvider } from './src/context/BrandingContext';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <BrandingProvider>
        <AuthProvider>
          <RootNavigator />
          <AppNoticeHost />
          <StatusBar style="auto" />
        </AuthProvider>
      </BrandingProvider>
    </SafeAreaProvider>
  );
}
