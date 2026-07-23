import type {
  AuthResult,
  AuthUser,
  LoginPayload,
  RegisterPatientPayload,
} from '../types/auth';
import { MOBILE_ROLES } from '../types/auth';
import { ApiError, apiRequest } from './api.client';
import { storageService } from './storage.service';

const MOBILE_ROLES_MESSAGE =
  'Esta aplicación es para pacientes y doctores. El panel admin está en la web.';

export type OtpPurpose = 'register' | 'reset';

function assertMobileRole(result: AuthResult): AuthResult {
  if (!MOBILE_ROLES.includes(result.user.role)) {
    throw new ApiError(MOBILE_ROLES_MESSAGE, 403, result);
  }
  return result;
}

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResult> {
    const result = await apiRequest<AuthResult>('/auth/login', {
      method: 'POST',
      body: payload,
    });
    const allowed = assertMobileRole(result);
    await storageService.saveSession(allowed);
    return allowed;
  },

  async registerPatient(payload: RegisterPatientPayload): Promise<AuthResult> {
    const result = await apiRequest<AuthResult>('/auth/register/patient', {
      method: 'POST',
      body: payload,
    });
    const allowed = assertMobileRole(result);
    await storageService.saveSession(allowed);
    return allowed;
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
    if (!MOBILE_ROLES.includes(user.role)) {
      await storageService.clearSession();
      return null;
    }
    return user;
  },
};
