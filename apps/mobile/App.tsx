// @@iconify-code-gen
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNoticeHost } from './src/components/notices/AppNoticeHost';
import './src/components/notices/patchAlert';
import { SplashVideo } from './src/components/SplashVideo';
import { AuthProvider } from './src/context/AuthContext';
import { BrandingProvider } from './src/context/BrandingContext';
import { RootNavigator } from './src/navigation/RootNavigator';

void SplashScreen.preventAutoHideAsync();

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <SafeAreaProvider>
      <BrandingProvider>
        <AuthProvider>
          <RootNavigator />
          <AppNoticeHost />
          <StatusBar style="auto" />
          {showSplash ? (
            <SplashVideo onFinish={() => setShowSplash(false)} />
          ) : null}
        </AuthProvider>
      </BrandingProvider>
    </SafeAreaProvider>
  );
}
