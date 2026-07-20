"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClientFetch } from "@/lib/api-client";

export type FitzpatrickType = "I" | "II" | "III" | "IV" | "V" | "VI";

export interface SurveyState {
  surveyCompletedAt: string | null;
  surveyResponses: Record<string, string> | null;
  skinType: string | null;
  fitzpatrickType: FitzpatrickType | null;
}

export interface SurveyInput {
  skinType?: string;
  fitzpatrickType?: FitzpatrickType;
  surveyResponses: Record<string, string>;
}

export function useMySurvey() {
  return useQuery({
    queryKey: ["me", "survey"],
    queryFn: () => apiClientFetch<SurveyState>("/me/survey"),
  });
}

export function useSubmitSurvey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SurveyInput) =>
      apiClientFetch<SurveyState>("/me/survey", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "survey"] });
    },
  });
}
