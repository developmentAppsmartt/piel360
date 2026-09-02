import type {
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
    const { email, password } = payload;
    const result = await apiRequest<AuthResult>('/auth/login', {
      method: 'POST',
      body: { email, password },
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

  async sendPhoneOtp(phone: string): Promise<void> {
    await apiRequest<{ ok: true }>('/auth/otp/phone/send', {
      method: 'POST',
      body: { phone },
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
  ): Promise<{ ticket: string }> {
    const result = await apiRequest<{ ok: true; ticket: string }>(
      '/auth/otp/phone/verify',
      {
        method: 'POST',
        body: { phone, code: code.trim() },
      },
    );
    return { ticket: result.ticket };
  },

  async confirmPhoneVerification(phone: string, phoneTicket: string): Promise<void> {
    await apiRequest<{ ok: true }>('/auth/me/phone/confirm', {
      method: 'POST',
      auth: true,
      body: { phone, phoneTicket },
    });
  },

  async meDetails(): Promise<MeUserDetails> {
    const user = await apiRequest<{
      id: string | number | bigint;
      email: string;
      phone: string | null;
      phoneVerifiedAt: string | null;
      patient?: { id: string | number | bigint } | null;
      doctor?: { id: string | number | bigint; phone: string | null } | null;
    }>('/auth/me', { auth: true });
    return {
      id: String(user.id),
      email: user.email,
      phone: user.phone,
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

  async me(): Promise<AuthUser> {
    return apiRequest<AuthUser>('/auth/me', { auth: true });
  },

  async logout(): Promise<void> {
    await storageService.clearSession();
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
