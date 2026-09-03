"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClientFetch } from "@/lib/api-client";

export interface EmailTemplate {
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
}

export interface EmailTemplateVariable {
  id: string | null;
  key: string;
  description: string;
  sampleValue: string | null;
  isSystem: boolean;
}

export interface EmailTemplateMeta {
  kinds: { id: string; label: string }[];
  variables: EmailTemplateVariable[];
  integrations: {
    google: {
      connected: boolean;
      status: string;
      message: string;
    };
    mailProvider: {
      connected: boolean;
      provider: string | null;
      status: string;
      message: string;
    };
  };
}

export type EmailTemplateCreateInput = {
  name: string;
  subject: string;
  preheader?: string;
  bodyHtml?: string;
  isActive?: boolean;
};

export type EmailTemplateUpdate = {
  name?: string;
  subject?: string;
  preheader?: string | null;
  bodyHtml?: string;
  isActive?: boolean;
};

export type EmailTemplateVariableInput = {
  key: string;
  description: string;
  sampleValue?: string | null;
};

export function useEmailTemplateMeta() {
  return useQuery({
    queryKey: ["email-templates", "meta"],
    queryFn: () => apiClientFetch<EmailTemplateMeta>("/email-templates/meta"),
  });
}

export function useEmailTemplates() {
  return useQuery({
    queryKey: ["email-templates"],
    queryFn: () => apiClientFetch<EmailTemplate[]>("/email-templates"),
  });
}

export function useCreateEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EmailTemplateCreateInput) =>
      apiClientFetch<EmailTemplate>("/email-templates", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email-templates"] }),
  });
}

export function useUpdateEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: EmailTemplateUpdate }) =>
      apiClientFetch<EmailTemplate>(`/email-templates/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email-templates"] }),
  });
}

export function useDeleteEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClientFetch(`/email-templates/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email-templates"] }),
  });
}

export async function uploadEmailBanner(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);
  return apiClientFetch<{ key: string; url: string }>(
    "/email-templates/banners",
    {
      method: "POST",
      body: form,
    },
  );
}

function invalidateVariables(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["email-templates", "meta"] });
}

export function useCreateEmailTemplateVariable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EmailTemplateVariableInput) =>
      apiClientFetch("/email-templates/variables", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateVariables(qc),
  });
}

export function useUpdateEmailTemplateVariable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: EmailTemplateVariableInput;
    }) =>
      apiClientFetch(`/email-templates/variables/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateVariables(qc),
  });
}

export function useDeleteEmailTemplateVariable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClientFetch(`/email-templates/variables/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => invalidateVariables(qc),
  });
}
