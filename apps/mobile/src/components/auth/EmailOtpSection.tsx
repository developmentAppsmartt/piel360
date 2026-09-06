import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View, StyleSheet } from 'react-native';
import { authService } from '../../services/auth.service';
import { ApiError } from '../../services/api.client';
import { OtpInput } from '../../views/auth/components/OtpInput';

type EmailOtpSectionProps = {
  email: string;
  emailTicket: string | null;
  onEmailTicketChange: (ticket: string | null) => void;
  disabled?: boolean;
  variant?: 'auth' | 'card';
  primaryColor?: string;
  onDark?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailOtpSection({
  email,
  emailTicket,
  onEmailTicketChange,
  disabled = false,
  variant = 'card',
  primaryColor = '#7C5CFF',
  onDark = '#FFFFFF',
}: EmailOtpSectionProps) {
  const emailValid = EMAIL_RE.test(email.trim());

  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sentFor, setSentFor] = useState<string | null>(null);

  const isAuth = variant === 'auth';
  const inputBg = isAuth ? 'rgba(255,255,255,0.94)' : '#FFFFFF';
  const hintColor = isAuth ? 'rgba(255,255,255,0.72)' : '#6B7280';
  const errorColor = isAuth ? '#FCA5A5' : '#DC2626';
  const okColor = isAuth ? '#86EFAC' : '#16A34A';

  const emailChanged = sentFor != null && sentFor !== email.trim().toLowerCase();

  function resetFlow() {
    setOtpSent(false);
    setOtpCode('');
    setOtpError(null);
    setSentFor(null);
    onEmailTicketChange(null);
  }

  useEffect(() => {
    if (emailChanged) resetFlow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  async function handleSend() {
    setOtpError(null);
    setSending(true);
    try {
      await authService.sendOtp(email, 'register');
      setOtpSent(true);
      setSentFor(email.trim().toLowerCase());
    } catch (err) {
      setOtpError(
        err instanceof ApiError ? err.message : 'No se pudo enviar el código.',
      );
    } finally {
      setSending(false);
    }
  }

  async function handleVerify() {
    setOtpError(null);
    setVerifying(true);
    try {
      const result = await authService.verifyOtp(email, 'register', otpCode);
      onEmailTicketChange(result.ticket ?? null);
    } catch (err) {
      setOtpError(
        err instanceof ApiError ? err.message : 'No se pudo verificar el código.',
      );
    } finally {
      setVerifying(false);
    }
  }

  return (
    <View style={styles.wrap}>
      {emailValid && emailTicket == null ? (
        <Pressable
          style={[styles.sendBtn, { borderColor: primaryColor }]}
          onPress={handleSend}
          disabled={!emailValid || sending || disabled}
        >
          {sending ? (
            <ActivityIndicator color={primaryColor} />
          ) : (
            <Text style={[styles.sendBtnText, { color: primaryColor }]}>
              {otpSent ? 'Reenviar código al correo' : 'Verificar correo'}
            </Text>
          )}
        </Pressable>
      ) : null}

      {otpSent && emailTicket == null ? (
        <View style={[styles.otpBox, isAuth ? styles.otpBoxAuth : null]}>
          <Text style={[styles.hint, { color: hintColor }]}>
            Te enviamos un código a {email}.
          </Text>
          <OtpInput
            value={otpCode}
            onChange={setOtpCode}
            editable={!verifying && !disabled}
            textColor="#1A1A1A"
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
              <Text style={styles.verifyBtnText}>Verificar correo</Text>
            )}
          </Pressable>
        </View>
      ) : null}

      {emailTicket != null ? (
        <Text style={[styles.ok, { color: okColor }]}>Correo verificado.</Text>
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
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  sendBtnText: {
    fontSize: 14,
    fontWeight: '700',
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
