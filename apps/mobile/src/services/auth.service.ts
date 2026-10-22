import { isRecaptchaNativeReady } from '../config/recaptcha';
import type {
  AccountStatus,
  AuthResult,
  AuthUser,
  LoginPayload,
  MeUserDetails,
  RegisterPatientPayload,
} from '../types/auth';
import {
  assertMobileLoginAllowed,
  isStoredMobileSessionUser,
} from '../lib/mobile-auth-access';
import { apiRequest } from './api.client';
import { storageService } from './storage.service';

export type OtpPurpose = 'register' | 'reset';

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResult> {
    const { email, password, captchaToken } = payload;
    // Solo con SDK nativo activo; prod antigua rechaza captchaToken en el DTO.
    const token =
      isRecaptchaNativeReady() && captchaToken?.trim()
        ? captchaToken.trim()
        : undefined;
    const result = await apiRequest<AuthResult>('/auth/login', {
      method: 'POST',
      body: {
        email,
        password,
        ...(token ? { captchaToken: token } : {}),
      },
    });
    const allowed = assertMobileLoginAllowed(result);
    await storageService.saveSession(allowed);
    return allowed;
  },

  async registerPatient(payload: RegisterPatientPayload): Promise<AuthResult> {
    const result = await apiRequest<AuthResult>('/auth/register/patient', {
      method: 'POST',
      body: payload,
    });
    const allowed = assertMobileLoginAllowed(result);
    await storageService.saveSession(allowed);
    return allowed;
  },

  async sendPhoneOtp(
    phone: string,
    purpose: 'register' | 'reset' = 'register',
  ): Promise<void> {
    await apiRequest<{ ok: true }>('/auth/otp/phone/send', {
      method: 'POST',
      body: { phone, purpose },
    });
  },

  async sendPhoneOtpForProfile(phone: string): Promise<void> {
    await apiRequest<{ ok: true }>('/auth/me/otp/phone/send', {
      method: 'POST',
      auth: true,
      body: { phone },
    });
  },

  async verifyPhoneOtp(
    phone: string,
    code: string,
    purpose: 'register' | 'reset' = 'register',
  ): Promise<{ ticket?: string; token?: string }> {
    const result = await apiRequest<{
      ok: true;
      ticket?: string;
      token?: string;
    }>('/auth/otp/phone/verify', {
      method: 'POST',
      body: { phone, code: code.trim(), purpose },
    });
    return { ticket: result.ticket, token: result.token };
  },

  async confirmPhoneVerification(phone: string, phoneTicket: string): Promise<void> {
    await apiRequest<{ ok: true }>('/auth/me/phone/confirm', {
      method: 'POST',
      auth: true,
      body: { phone, phoneTicket },
    });
  },

  /** Cuenta deshabilitada por admin + si el profesional quedó sin plan. */
  async accountStatus(): Promise<AccountStatus> {
    return apiRequest<AccountStatus>('/auth/me/account-status', { auth: true });
  },

  async meDetails(): Promise<MeUserDetails> {
    const user = await apiRequest<{
      id: string | number | bigint;
      email: string;
      phone: string | null;
      phoneVerifiedAt: string | null;
      patient?: {
        id: string | number | bigint;
        phone?: string | null;
        areaCode?: string | null;
      } | null;
      doctor?: { id: string | number | bigint; phone: string | null } | null;
    }>('/auth/me', { auth: true });
    // Algunos pacientes solo tienen el celular en patients.*; el CRM lee eso.
    const patientPhoneDigits =
      user.patient?.phone != null
        ? `${(user.patient.areaCode ?? '').replace(/\D/g, '')}${user.patient.phone.replace(/\D/g, '')}`
        : null;
    const phone =
      user.phone?.replace(/\D/g, '') ||
      user.doctor?.phone?.replace(/\D/g, '') ||
      patientPhoneDigits ||
      null;
    return {
      id: String(user.id),
      email: user.email,
      phone,
      phoneVerifiedAt: user.phoneVerifiedAt,
      patient: user.patient
        ? { id: String(user.patient.id) }
        : null,
      doctor: user.doctor
        ? { id: String(user.doctor.id), phone: user.doctor.phone }
        : null,
    };
  },

  async sendOtp(email: string, purpose: OtpPurpose): Promise<void> {
    await apiRequest<{ ok: true }>('/auth/otp/send', {
      method: 'POST',
      body: { email: email.trim().toLowerCase(), purpose },
    });
  },

  async verifyOtp(
    email: string,
    purpose: OtpPurpose,
    code: string,
  ): Promise<{ ticket?: string; token?: string }> {
    return apiRequest<{ ok: true; ticket?: string; token?: string }>(
      '/auth/otp/verify',
      {
        method: 'POST',
        body: {
          email: email.trim().toLowerCase(),
          purpose,
          code: code.trim(),
        },
      },
    );
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await apiRequest<{ ok: true }>('/auth/reset-password', {
      method: 'POST',
      body: { token, password },
    });
  },

  /** Cambio de contraseña con sesión activa (token atado al usuario logueado). */
  async sendChangePasswordOtp(
    channel: 'email' | 'phone',
    phone?: string,
  ): Promise<void> {
    await apiRequest<{ ok: true }>('/auth/me/password/otp/send', {
      method: 'POST',
      auth: true,
      body: {
        channel,
        ...(channel === 'phone' && phone ? { phone } : {}),
      },
    });
  },

  async verifyChangePasswordOtp(
    channel: 'email' | 'phone',
    code: string,
    phone?: string,
  ): Promise<{ token: string; phoneTicket?: string }> {
    const result = await apiRequest<{
      ok: true;
      token: string;
      phoneTicket?: string;
    }>('/auth/me/password/otp/verify', {
      method: 'POST',
      auth: true,
      body: {
        channel,
        code: code.trim(),
        ...(channel === 'phone' && phone ? { phone } : {}),
      },
    });
    return { token: result.token, phoneTicket: result.phoneTicket };
  },

  async me(): Promise<AuthUser> {
    return apiRequest<AuthUser>('/auth/me', { auth: true });
  },

  async logout(): Promise<void> {
    // Libera el cupo de sesión en el backend (best effort: si falla la red,
    // igual se limpia la sesión local).
    await apiRequest('/auth/logout', { method: 'POST', auth: true }).catch(
      () => undefined,
    );
    await storageService.clearSession();
  },

  /** Renueva access/refresh re-resolviendo rol desde BD. */
  async refreshSession(): Promise<AuthResult | null> {
    const refreshToken = await storageService.getRefreshToken();
    if (!refreshToken) return null;
    try {
      const result = await apiRequest<AuthResult>('/auth/refresh', {
        method: 'POST',
        body: { refreshToken },
      });
      const allowed = assertMobileLoginAllowed(result);
      await storageService.saveSession(allowed);
      return allowed;
    } catch {
      return null;
    }
  },

  async hydrateSession(): Promise<AuthUser | null> {
    const [token, user] = await Promise.all([
      storageService.getAccessToken(),
      storageService.getUser(),
    ]);
    if (!token || !user) {
      await storageService.clearSession();
      return null;
    }
    if (!isStoredMobileSessionUser(user)) {
      await storageService.clearSession();
      return null;
    }
    return user;
  },
};
