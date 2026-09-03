"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClientFetch } from "@/lib/api-client";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ProductCategory {
  id: string;
  doctorId: string;
  categoryName: string;
  createdAt: string;
  lastModified: string;
  _count?: { products: number };
}

export type ProductType = "product" | "supplement";

export interface Product {
  id: string;
  doctorId: string;
  categoryId: string;
  productName: string;
  productType: ProductType;
  productDescription: string | null;
  productUrl: string | null;
  imageUrl: string | null;
  enablePrice: boolean;
  pricingType: "fixed" | "variable" | null;
  currencyCode: string;
  originalPrice: string | null;
  sellingPrice: string | null;
  createdAt: string;
  updatedAt: string;
  category: { id: string; categoryName: string };
}

export interface CreateCategoryInput {
  categoryName: string;
}

export interface CreateProductInput {
  productName: string;
  productType?: ProductType;
  productDescription?: string;
  productUrl?: string;
  categoryId: number | string;
  enablePrice?: boolean;
  pricingType?: "fixed" | "variable";
  currencyCode?: string;
  originalPrice?: number;
  sellingPrice?: number;
}

// ─── Categorías ────────────────────────────────────────────────────────────────

export function useProductCategories() {
  return useQuery({
    queryKey: ["product-categories"],
    queryFn: () => apiClientFetch<ProductCategory[]>("/products/categories"),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCategoryInput) =>
      apiClientFetch<ProductCategory>("/products/categories", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-categories"] });
    },
  });
}

export function useUpdateCategory(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<CreateCategoryInput>) =>
      apiClientFetch<ProductCategory>(`/products/categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-categories"] });
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClientFetch(`/products/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-categories"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

// ─── Productos ─────────────────────────────────────────────────────────────────

export function useProducts(
  categoryId?: string,
  productType?: ProductType,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ["products", categoryId, productType],
    queryFn: () => {
      const params = new URLSearchParams();
      if (categoryId) params.set("categoryId", categoryId);
      if (productType) params.set("productType", productType);
      const query = params.toString();
      return apiClientFetch<Product[]>(query ? `/products?${query}` : "/products");
    },
    enabled: options?.enabled ?? true,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["products", id],
    queryFn: () => apiClientFetch<Product>(`/products/${id}`),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProductInput) =>
      apiClientFetch<Product>("/products", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateProduct(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<CreateProductInput>) =>
      apiClientFetch<Product>(`/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["products", id] });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClientFetch(`/products/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUploadProductImage(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return apiClientFetch<Product>(`/products/${id}/image`, {
        method: "POST",
        body: form,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["products", id] });
    },
  });
}
