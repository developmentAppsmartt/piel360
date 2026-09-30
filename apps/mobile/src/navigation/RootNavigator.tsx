import { ActivityIndicator, View } from 'react-native';
import {
  NavigationContainer,
  type NavigationState,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { LoginView } from '../views/auth/login/LoginView';
import { RegisterView } from '../views/auth/register/RegisterView';
import { ForgotPasswordView } from '../views/auth/forgot-password/ForgotPasswordView';
import { MainTabNavigator } from './MainTabNavigator';
import { PhoneVerificationView } from '../views/auth/phone-verification/PhoneVerificationView';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type AppStackParamList = {
  MainTabs: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <AuthStack.Screen name="Login" component={LoginView} />
      <AuthStack.Screen name="Register" component={RegisterView} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordView} />
    </AuthStack.Navigator>
  );
}

function AppNavigator() {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="MainTabs" component={MainTabNavigator} />
    </AppStack.Navigator>
  );
}

/**
 * Estado de navegación guardado fuera del componente: al recuperar la
 * conexión, App remonta el navegador (para recargar datos) y así el usuario
 * vuelve a la misma pantalla. Se descarta si cambia la sesión.
 */
let persistedNavState: NavigationState | undefined;
let persistedNavScope: string | null = null;

export function RootNavigator() {
  const { user, isLoading, needsPhoneVerification } = useAuth();
  const branding = useBranding();
  const navScope = user
    ? `${user.id}:${needsPhoneVerification ? 'phone' : 'app'}`
    : 'auth';
  const initialState =
    persistedNavScope === navScope ? persistedNavState : undefined;

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0B0A12',
        }}
      >
        <ActivityIndicator size="large" color={branding.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer
      initialState={initialState}
      onStateChange={(state) => {
        persistedNavState = state;
        persistedNavScope = navScope;
      }}
    >
      {user ? (
        needsPhoneVerification ? <PhoneVerificationView /> : <AppNavigator />
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}
