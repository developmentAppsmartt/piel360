import { apiRequest } from './api.client';
import { appendImageField } from './form-image';

export type CreateFitzpatrickAnalysisResult = {
  analysisId: string;
};

export const fitzpatrickService = {
  /** `POST /fitzpatrick/analyses` — síncrono (espera resultado). */
  async createAnalysis(input: {
    patientId: string;
    imageUri: string;
  }): Promise<CreateFitzpatrickAnalysisResult> {
    const form = new FormData();
    await appendImageField(form, 'image', input.imageUri);
    form.append('patientId', input.patientId);

    return apiRequest<CreateFitzpatrickAnalysisResult>('/fitzpatrick/analyses', {
      method: 'POST',
      auth: true,
      body: form,
      formData: true,
    });
  },
};
