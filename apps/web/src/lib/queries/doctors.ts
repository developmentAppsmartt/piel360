"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClientFetch } from "@/lib/api-client";

// Shape de GET /admin/doctors(/:id) — `id` es string por el polyfill de BigInt
// del backend. `user` viene incluido desde doctors.service.ts#findAll/findOne.
export interface Doctor {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  gender: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  zip: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    email: string;
  };
}

// Shape de GET /doctors/me — mismo modelo que `Doctor` pero sin `user`:
// doctors.service.ts#requireDoctorByUserId (el que sirve este endpoint) hace
// un `findUnique` plano sin `include`.
export interface MyDoctorProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  gender: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  zip: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DoctorInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  zip?: string;
}

export function useMyDoctorProfile() {
  return useQuery({
    queryKey: ["doctors", "me"],
    queryFn: () => apiClientFetch<MyDoctorProfile>("/doctors/me"),
  });
}

export function useDoctors() {
  return useQuery({
    queryKey: ["admin", "doctors"],
    queryFn: () => apiClientFetch<Doctor[]>("/admin/doctors"),
  });
}

export function useDoctor(id: string) {
  return useQuery({
    queryKey: ["admin", "doctors", id],
    queryFn: () => apiClientFetch<Doctor>(`/admin/doctors/${id}`),
  });
}

export function useUpdateDoctor(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DoctorInput) =>
      apiClientFetch<Doctor>(`/admin/doctors/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "doctors"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "doctors", id] });
    },
  });
}
