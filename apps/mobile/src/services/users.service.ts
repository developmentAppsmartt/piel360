import { apiRequest } from './api.client';
import { appendImageField } from './form-image';

export type AvatarUploadResult = {
  avatarKey: string | null;
  avatarUrl: string | null;
};

export type DiagnosticLanguage = 'es' | 'en';

export const usersService = {
  async getDiagnosticLanguage(): Promise<DiagnosticLanguage> {
    const me = await apiRequest<{ diagnosticLanguage?: string | null }>(
      '/auth/me',
      { auth: true },
    );
    return me.diagnosticLanguage === 'en' ? 'en' : 'es';
  },

  async updateDiagnosticLanguage(
    diagnosticLanguage: DiagnosticLanguage,
  ): Promise<void> {
    await apiRequest('/me', {
      method: 'PATCH',
      auth: true,
      body: { diagnosticLanguage },
    });
  },

  async uploadAvatar(imageUri: string): Promise<AvatarUploadResult> {
    const form = new FormData();
    await appendImageField(form, 'avatar', imageUri, 'avatar.jpg');
    return apiRequest('/me/avatar', {
      method: 'POST',
      auth: true,
      body: form,
      formData: true,
    });
  },
};
