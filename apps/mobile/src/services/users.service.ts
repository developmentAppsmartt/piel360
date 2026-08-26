import { apiRequest } from './api.client';
import { appendImageField } from './form-image';

export type AvatarUploadResult = {
  avatarKey: string | null;
  avatarUrl: string | null;
};

export const usersService = {
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
