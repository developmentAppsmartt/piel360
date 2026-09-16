// @@iconify-code-gen
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNoticeHost } from './src/components/notices/AppNoticeHost';
import './src/components/notices/patchAlert';
import { SplashIntro } from './src/components/SplashVideo';
import { AuthProvider } from './src/context/AuthContext';
import { BrandingProvider } from './src/context/BrandingContext';
import { NotificationsProvider } from './src/context/NotificationsContext';
import { RootNavigator } from './src/navigation/RootNavigator';

void SplashScreen.preventAutoHideAsync();

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <SafeAreaProvider>
      <BrandingProvider>
        <AuthProvider>
          <NotificationsProvider>
            {/* No montar la app con tabs mientras corre el splash. */}
            {!showSplash ? <RootNavigator /> : null}
            {!showSplash ? <AppNoticeHost /> : null}
            <StatusBar style={showSplash ? 'light' : 'auto'} />
            {showSplash ? (
              <SplashIntro onFinish={() => setShowSplash(false)} />
            ) : null}
          </NotificationsProvider>
        </AuthProvider>
      </BrandingProvider>
    </SafeAreaProvider>
  );
}
