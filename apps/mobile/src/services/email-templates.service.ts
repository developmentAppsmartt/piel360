import { apiRequest } from './api.client';

export type EmailTemplate = {
  id: string;
  doctorId: string;
  kind: string;
  kindLabel: string;
  name: string;
  subject: string;
  preheader: string | null;
  bodyHtml: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type EmailTemplateOrDefault = Omit<
  EmailTemplate,
  'id' | 'createdAt' | 'updatedAt'
> & {
  id: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  isDefault: boolean;
};

export type EmailTemplateMeta = {
  kinds: { id: string; label: string }[];
  variables: {
    id: string | null;
    key: string;
    description: string;
    sampleValue: string | null;
    isSystem: boolean;
  }[];
  integrations: {
    google: { connected: boolean; status: string; message: string };
    mailProvider: {
      connected: boolean;
      provider: string | null;
      status: string;
      message: string;
    };
  };
};

export const emailTemplatesService = {
  async meta(): Promise<EmailTemplateMeta> {
    return apiRequest<EmailTemplateMeta>('/email-templates/meta', {
      auth: true,
    });
  },

  async list(): Promise<EmailTemplate[]> {
    return apiRequest<EmailTemplate[]>('/email-templates', { auth: true });
  },

  async getByKind(kind: string): Promise<EmailTemplateOrDefault> {
    return apiRequest<EmailTemplateOrDefault>(
      `/email-templates/by-kind/${encodeURIComponent(kind)}`,
      { auth: true },
    );
  },

  async setActive(id: string, isActive: boolean): Promise<EmailTemplate> {
    return apiRequest<EmailTemplate>(
      `/email-templates/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        auth: true,
        body: JSON.stringify({ isActive }),
      },
    );
  },
};
