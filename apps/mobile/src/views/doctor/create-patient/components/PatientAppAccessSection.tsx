import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as PasswordPolicy from '../../../../lib/password';

/** Fallback si HMR deja el módulo de password a medias (Hermes named-import). */
const PASSWORD_HINT =
  PasswordPolicy.PASSWORD_STRENGTH_HINT ??
  'Mínimo 8 caracteres, con letras, números y un símbolo';

type PatientAppAccessSectionProps = {
  createAppAccess: boolean;
  onCreateAppAccessChange: (value: boolean) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  accentColor: string;
  textColor: string;
  mutedColor: string;
};

/** Misma idea que el CRM (`patient-app-access-section`): cartera vs cuenta app. */
export function PatientAppAccessSection({
  createAppAccess,
  onCreateAppAccessChange,
  password,
  onPasswordChange,
  accentColor,
  textColor,
  mutedColor,
}: PatientAppAccessSectionProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: textColor }]}>
            Acceso a la app
          </Text>
          <Text style={[styles.description, { color: mutedColor }]}>
            Si lo activas, el paciente podrá iniciar sesión en Piel360 con
            correo y contraseña.
          </Text>
        </View>
        <Pressable
          style={styles.checkRow}
          onPress={() => onCreateAppAccessChange(!createAppAccess)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: createAppAccess }}
        >
          <View
            style={[
              styles.checkbox,
              { borderColor: accentColor },
              createAppAccess && { backgroundColor: accentColor },
            ]}
          >
            {createAppAccess ? (
              <Text style={styles.checkMark}>✓</Text>
            ) : null}
          </View>
          <Text style={[styles.checkLabel, { color: textColor }]}>
            Crear cuenta
          </Text>
        </Pressable>
      </View>

      {createAppAccess ? (
        <View style={styles.passwordBlock}>
          <Text style={[styles.passwordLabel, { color: mutedColor }]}>
            Contraseña *
          </Text>
          <TextInput
            style={[styles.input, { color: textColor }]}
            value={password}
            onChangeText={onPasswordChange}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="newPassword"
            placeholder={PASSWORD_HINT}
            placeholderTextColor="#9CA3AF"
          />
          <Text style={[styles.hint, { color: mutedColor }]}>
            {PASSWORD_HINT}
          </Text>
        </View>
      ) : (
        <View style={styles.infoBox}>
          <Text style={[styles.infoText, { color: mutedColor }]}>
            El paciente se registrará solo en tu cartera. Podrás añadir acceso a
            la app más adelante desde su perfil.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  header: {
    gap: 12,
  },
  headerText: {
    gap: 4,
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  checkRow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  checkLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  passwordBlock: {
    gap: 6,
  },
  passwordLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
  },
  infoBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
