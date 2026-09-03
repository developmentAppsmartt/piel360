import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
} from 'react-native';
import { authService } from '../../services/auth.service';
import { ApiError } from '../../services/api.client';
import {
  combinePhoneDigits,
  digitsOnly,
  isValidE164Digits,
} from '../../lib/phone';
import { PhoneSplitInputs } from './PhoneSplitInputs';
import { OtpInput } from '../../views/auth/components/OtpInput';

type PhoneOtpSectionProps = {
  prefix: string;
  national: string;
  onPrefixChange: (value: string) => void;
  onNationalChange: (value: string) => void;
  originalPhoneDigits?: string;
  phoneTicket: string | null;
  onPhoneTicketChange: (ticket: string | null) => void;
  /** Registro público vs perfil autenticado. */
  mode?: 'register' | 'profile';
  disabled?: boolean;
  variant?: 'auth' | 'card';
  primaryColor?: string;
  onDark?: string;
};

export function PhoneOtpSection({
  prefix,
  national,
  onPrefixChange,
  onNationalChange,
  originalPhoneDigits = '',
  phoneTicket,
  onPhoneTicketChange,
  mode = 'register',
  disabled = false,
  variant = 'card',
  primaryColor = '#7C5CFF',
  onDark = '#FFFFFF',
}: PhoneOtpSectionProps) {
  const phone = combinePhoneDigits(prefix, national);
  const phoneValid =
    digitsOnly(prefix).length >= 1 &&
    digitsOnly(national).length >= 7 &&
    isValidE164Digits(phone);
  const phoneChanged = !originalPhoneDigits || phone !== originalPhoneDigits;
  const requiresOtp = phoneChanged && phoneValid;

  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const isAuth = variant === 'auth';
  const inputBg = isAuth ? 'rgba(255,255,255,0.94)' : '#FFFFFF';
  const labelColor = isAuth ? onDark : '#374151';
  const hintColor = isAuth ? 'rgba(255,255,255,0.72)' : '#6B7280';
  const errorColor = isAuth ? '#FCA5A5' : '#DC2626';
  const okColor = isAuth ? '#86EFAC' : '#16A34A';

  function resetFlow() {
    setOtpSent(false);
    setOtpCode('');
    setOtpError(null);
    onPhoneTicketChange(null);
  }

  useEffect(() => {
    if (!phoneChanged) resetFlow();
  }, [phoneChanged]);

  async function handleSend() {
    setOtpError(null);
    setSending(true);
    try {
      if (mode === 'profile') {
        await authService.sendPhoneOtpForProfile(phone);
      } else {
        await authService.sendPhoneOtp(phone);
      }
      setOtpSent(true);
    } catch (err) {
      setOtpError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo enviar el código.',
      );
    } finally {
      setSending(false);
    }
  }

  async function handleVerify() {
    setOtpError(null);
    setVerifying(true);
    try {
      const result = await authService.verifyPhoneOtp(phone, otpCode);
      onPhoneTicketChange(result.ticket);
    } catch (err) {
      setOtpError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo verificar el código.',
      );
    } finally {
      setVerifying(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <PhoneSplitInputs
        prefix={prefix}
        national={national}
        onPrefixChange={(value) => {
          onPrefixChange(value);
          if (otpSent) resetFlow();
        }}
        onNationalChange={(value) => {
          onNationalChange(value);
          if (otpSent) resetFlow();
        }}
        disabled={disabled || (requiresOtp && phoneTicket != null)}
        prefixBackground={inputBg}
        nationalBackground={inputBg}
      />

      {!requiresOtp && originalPhoneDigits && phoneValid ? (
        <Text style={[styles.hint, { color: hintColor }]}>
          Celular sin cambios — no hace falta verificar de nuevo.
        </Text>
      ) : null}

      {requiresOtp && phoneTicket == null ? (
        <Pressable
          style={[styles.sendBtn, { borderColor: primaryColor }]}
          onPress={handleSend}
          disabled={!phoneValid || sending || disabled}
        >
          {sending ? (
            <ActivityIndicator color={primaryColor} />
          ) : (
            <Text style={[styles.sendBtnText, { color: labelColor }]}>
              {otpSent ? 'Reenviar código SMS' : 'Enviar código SMS'}
            </Text>
          )}
        </Pressable>
      ) : null}

      {requiresOtp && otpSent && phoneTicket == null ? (
        <View style={[styles.otpBox, isAuth ? styles.otpBoxAuth : null]}>
          <Text style={[styles.hint, { color: hintColor }]}>
            Te enviamos un código por SMS a +{phone}.
          </Text>
          <OtpInput
            value={otpCode}
            onChange={setOtpCode}
            editable={!verifying && !disabled}
            textColor={isAuth ? '#1A1A1A' : '#1A1A1A'}
            boxBackground={inputBg}
          />
          <Pressable
            style={[styles.verifyBtn, { backgroundColor: primaryColor }]}
            onPress={handleVerify}
            disabled={otpCode.trim().length < 4 || verifying || disabled}
          >
            {verifying ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.verifyBtnText}>Verificar celular</Text>
            )}
          </Pressable>
        </View>
      ) : null}

      {requiresOtp && phoneTicket != null ? (
        <Text style={[styles.ok, { color: okColor }]}>Celular verificado.</Text>
      ) : null}

      {otpError ? (
        <Text style={[styles.error, { color: errorColor }]}>{otpError}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
  },
  sendBtn: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  sendBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  otpBox: {
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    backgroundColor: '#F9FAFB',
  },
  otpBoxAuth: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.18)',
  },
  verifyBtn: {
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  ok: {
    fontSize: 12,
    fontWeight: '600',
  },
  error: {
    fontSize: 12,
  },
});
