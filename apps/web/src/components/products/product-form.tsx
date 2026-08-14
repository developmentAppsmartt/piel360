"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { ProductImageUpload } from "./product-image-upload";
import { ApiError } from "@/lib/api-error";
import { useProductCategories } from "@/lib/queries/products";
import { useAppConfig } from "@/lib/queries/app-config";
import type { Product, CreateProductInput } from "@/lib/queries/products";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z
  .object({
    productName: z.string().min(1, "Requerido").max(200),
    productDescription: z.string().optional(),
    productUrl: z
      .union([z.literal(""), z.string().url("URL inválida")])
      .optional(),
    categoryId: z.string().min(1, "Selecciona una categoría"),
    enablePrice: z.boolean(),
    pricingType: z.enum(["fixed", "variable"]).optional(),
    originalPrice: z.preprocess(
      (v) => (typeof v === "number" && isNaN(v) ? undefined : v),
      z.number({ invalid_type_error: "Ingresa un precio válido" }).positive("Debe ser mayor a 0").optional()
    ),
    sellingPrice: z.preprocess(
      (v) => (typeof v === "number" && isNaN(v) ? undefined : v),
      z.number({ invalid_type_error: "Ingresa un precio válido" }).positive("Debe ser mayor a 0").optional()
    ),
  })
  .superRefine((data, ctx) => {
    if (data.enablePrice) {
      if (!data.pricingType) {
        ctx.addIssue({
          code: "custom",
          path: ["pricingType"],
          message: "Selecciona el tipo de precio",
        });
      }
    }
  });

type FormValues = z.infer<typeof schema>;

// ─── Helpers de presentación ──────────────────────────────────────────────────

function FormField({
  label,
  id,
  error,
  children,
  optional,
}: {
  label: string;
  id: string;
  error?: string;
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
        {optional && (
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            (opcional)
          </span>
        )}
      </label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring disabled:opacity-50";

// ─── Componente principal ─────────────────────────────────────────────────────

export function ProductForm({
  defaultValues,
  onSubmit,
  submitLabel,
}: {
  defaultValues?: Product;
  onSubmit: (input: CreateProductInput) => Promise<unknown>;
  submitLabel: string;
}) {
  const { data: categories } = useProductCategories();
  const { data: currencyConfig } = useAppConfig("currency_code");
  const currency = currencyConfig?.value ?? "COP";

  // ID del producto guardado (para upload de imagen)
  // Si es edición ya existe; si es creación se pasa desde el padre tras crear.
  const productId = defaultValues?.id;

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    setError,
    formState,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      productName: defaultValues?.productName ?? "",
      productDescription: defaultValues?.productDescription ?? "",
      productUrl: defaultValues?.productUrl ?? "",
      categoryId: defaultValues?.categoryId ?? "",
      enablePrice: defaultValues?.enablePrice ?? false,
      pricingType: (defaultValues?.pricingType as "fixed" | "variable") ?? undefined,
      originalPrice: defaultValues?.originalPrice
        ? parseFloat(defaultValues.originalPrice)
        : undefined,
      sellingPrice: defaultValues?.sellingPrice
        ? parseFloat(defaultValues.sellingPrice)
        : undefined,
    },
  });

  const { errors, isSubmitting } = formState;

  const enablePrice = watch("enablePrice");
  const pricingType = watch("pricingType");

  // Si el precio se deshabilita, limpiar campos relacionados
  useEffect(() => {
    if (!enablePrice) {
      setValue("pricingType", undefined);
      setValue("originalPrice", undefined);
      setValue("sellingPrice", undefined);
    }
  }, [enablePrice, setValue]);

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit({
        productName: values.productName,
        productDescription: values.productDescription || undefined,
        productUrl: values.productUrl || undefined,
        categoryId: values.categoryId,
        enablePrice: values.enablePrice,
        pricingType: values.enablePrice ? values.pricingType : undefined,
        currencyCode: currency,
        originalPrice:
          values.enablePrice && pricingType === "fixed"
            ? values.originalPrice
            : undefined,
        sellingPrice: values.enablePrice ? values.sellingPrice : undefined,
      });
    } catch (err) {
      setError("root", {
        message:
          err instanceof ApiError ? err.message : "No se pudo guardar el producto.",
      });
    }
  });

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Imagen — solo en modo edición (el producto ya tiene ID) */}
      {productId && (
        <ProductImageUpload
          productId={productId}
          currentImageUrl={defaultValues?.imageUrl}
        />
      )}

      {/* Nombre */}
      <FormField label="Nombre del producto" id="productName" error={errors.productName?.message}>
        <input
          id="productName"
          className={inputCls}
          placeholder="Ej: Sérum Vitamina C"
          {...register("productName")}
        />
      </FormField>

      {/* Descripción */}
      <FormField label="Descripción" id="productDescription" error={errors.productDescription?.message} optional>
        <textarea
          id="productDescription"
          rows={3}
          className={inputCls}
          placeholder="Descripción breve del producto..."
          {...register("productDescription")}
        />
      </FormField>

      {/* URL del producto */}
      <FormField label="URL del producto" id="productUrl" error={errors.productUrl?.message} optional>
        <input
          id="productUrl"
          className={inputCls}
          placeholder="https://tienda.ejemplo.com/producto"
          {...register("productUrl")}
        />
      </FormField>

      {/* Categoría */}
      <FormField label="Categoría" id="categoryId" error={errors.categoryId?.message}>
        <select id="categoryId" className={inputCls} {...register("categoryId")}>
          <option value="">Selecciona una categoría</option>
          {categories?.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.categoryName}
            </option>
          ))}
        </select>
      </FormField>

      {/* Toggle precio */}
      <div className="flex items-center gap-3">
        <Controller
          control={control}
          name="enablePrice"
          render={({ field }) => (
            <button
              type="button"
              role="switch"
              id="enablePrice"
              aria-checked={field.value}
              onClick={() => field.onChange(!field.value)}
              className={[
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring",
                field.value ? "bg-sidebar-primary" : "bg-muted",
              ].join(" ")}
            >
              <span
                className={[
                  "pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm transition-transform",
                  field.value ? "translate-x-5" : "translate-x-0",
                ].join(" ")}
              />
            </button>
          )}
        />
        <label htmlFor="enablePrice" className="text-sm font-medium text-foreground cursor-pointer">
          Habilitar precio
        </label>
      </div>

      {/* Campos de precio — solo cuando está habilitado */}
      {enablePrice && (
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
          {/* Tipo de precio */}
          <FormField label="Tipo de precio" id="pricingType" error={errors.pricingType?.message}>
            <select id="pricingType" className={inputCls} {...register("pricingType")}>
              <option value="">Selecciona un tipo</option>
              <option value="fixed">Precio fijo</option>
              <option value="variable">Precio variable</option>
            </select>
          </FormField>

          {/* Moneda (readonly) */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">
              Moneda
            </label>
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
              <span className="font-mono font-semibold">{currency}</span>
              <span className="text-xs">(configurado globalmente por el administrador)</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Precio original — solo en precio fijo */}
            {pricingType === "fixed" && (
              <FormField
                label={`Precio original (${currency})`}
                id="originalPrice"
                error={errors.originalPrice?.message}
              >
                <input
                  id="originalPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  className={inputCls}
                  placeholder="0.00"
                  {...register("originalPrice", { valueAsNumber: true })}
                />
              </FormField>
            )}

            {/* Precio de venta */}
            <FormField
              label={`Precio de venta (${currency})`}
              id="sellingPrice"
              error={errors.sellingPrice?.message}
            >
              <input
                id="sellingPrice"
                type="number"
                step="0.01"
                min="0"
                className={inputCls}
                placeholder="0.00"
                {...register("sellingPrice", { valueAsNumber: true })}
              />
            </FormField>
          </div>
        </div>
      )}

      {errors.root && (
        <p className="text-sm text-destructive">{errors.root.message}</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
