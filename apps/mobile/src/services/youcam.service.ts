import { apiRequest } from './api.client';
import { appendImageField } from './form-image';
import { emitCreditsConsumed } from './session-events';

export type CreateYoucamAnalysisResult = {
  analysisId: string;
};

export const youcamService = {
  async createAnalysis(input: {
    patientId: string;
    imageUri: string;
    bodyRegion?: string;
  }): Promise<CreateYoucamAnalysisResult> {
    const form = new FormData();
    await appendImageField(form, 'image', input.imageUri);
    form.append('patientId', input.patientId);
    if (input.bodyRegion) form.append('bodyRegion', input.bodyRegion);

    const created = await apiRequest<CreateYoucamAnalysisResult>(
      '/youcam/analyses',
      { method: 'POST', auth: true, body: form, formData: true },
    );
    emitCreditsConsumed();
    return created;
  },
};
