import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
import { createHomeStyles } from './styles/home.styles';

export function HomeView() {
  const { user, logout } = useAuth();
  const branding = useBranding();
  const styles = useMemo(() => createHomeStyles(branding.colors), [branding.colors]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.title}>Hola, {user?.name ?? 'paciente'}</Text>
      <Text style={styles.subtitle}>
        Sesión iniciada como {user?.email}. Aquí irá el resto de la app.
      </Text>
      <Pressable style={styles.button} onPress={() => void logout()}>
        <Text style={styles.buttonText}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}
