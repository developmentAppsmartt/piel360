"use client";

import { useState } from "react";
import { PlusIcon, Pencil, Trash2, ExternalLink, ImageIcon } from "lucide-react";
import { createColumnHelper } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { ProductForm } from "./product-form";
import { ProductImageUpload } from "./product-image-upload";
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  type Product,
  type CreateProductInput,
  type ProductType,
} from "@/lib/queries/products";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(amount: string | null, currency: string) {
  if (!amount) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(parseFloat(amount));
}

// ─── Columnas ─────────────────────────────────────────────────────────────────

const col = createColumnHelper<Product>();

// ─── Diálogo de creación (dos pasos: primero crea, luego sube imagen) ─────────

function CreateProductDialog({ onClose }: { onClose: () => void }) {
  const createMutation = useCreateProduct();
  const [createdId, setCreatedId] = useState<string | null>(null);

  if (createdId) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Subir imagen del producto</DialogTitle>
          </DialogHeader>
          <ProductImageUpload
            productId={createdId}
            onUploaded={() => onClose()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Omitir por ahora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo producto</DialogTitle>
        </DialogHeader>
        <ProductForm
          submitLabel="Crear producto"
          onSubmit={async (input) => {
            const product = await createMutation.mutateAsync(input);
            setCreatedId(product.id);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

// ─── Diálogo de edición ───────────────────────────────────────────────────────

function EditProductDialog({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const updateMutation = useUpdateProduct(product.id);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar producto</DialogTitle>
        </DialogHeader>
        <ProductForm
          defaultValues={product}
          submitLabel="Guardar cambios"
          onSubmit={async (input: CreateProductInput) => {
            await updateMutation.mutateAsync(input);
            onClose();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ProductsTab() {
  const [typeFilter, setTypeFilter] = useState<ProductType | undefined>(undefined);
  const { data: products, isLoading } = useProducts(undefined, typeFilter);
  const deleteMutation = useDeleteProduct();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const columns = [
    col.accessor("imageUrl", {
      header: "",
      cell: (info) => {
        const url = info.getValue();
        return url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            className="size-10 rounded-lg object-cover border border-border"
          />
        ) : (
          <div className="size-10 rounded-lg border border-border bg-muted flex items-center justify-center">
            <ImageIcon className="size-4 text-muted-foreground" />
          </div>
        );
      },
    }),
    col.accessor("productName", { header: "Nombre" }),
    col.accessor("productType", {
      header: "Tipo",
      cell: (info) => (
        <Badge variant={info.getValue() === "supplement" ? "outline" : "secondary"}>
          {info.getValue() === "supplement" ? "Suplemento" : "Producto"}
        </Badge>
      ),
    }),
    col.accessor((row) => row.category.categoryName, {
      id: "category",
      header: "Categoría",
      cell: (info) => (
        <Badge variant="secondary">{info.getValue()}</Badge>
      ),
    }),
    col.accessor("enablePrice", {
      header: "Precio",
      cell: ({ row }) => {
        const { enablePrice, pricingType, sellingPrice, currencyCode } = row.original;
        if (!enablePrice) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="text-sm">
            <span className="font-medium">
              {formatPrice(sellingPrice, currencyCode)}
            </span>
            {pricingType && (
              <span className="ml-1 text-xs text-muted-foreground">
                ({pricingType === "fixed" ? "fijo" : "variable"})
              </span>
            )}
          </div>
        );
      },
    }),
    col.accessor("productUrl", {
      header: "URL",
      cell: (info) => {
        const url = info.getValue();
        return url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-sidebar-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="size-3" />
            Ver producto
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    }),
    col.accessor("updatedAt", {
      header: "Modificado",
      cell: (info) => new Date(info.getValue()).toLocaleDateString("es-CO"),
    }),
    col.display({
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation();
              setEditTarget(row.original);
            }}
          >
            <Pencil className="size-4" />
            <span className="sr-only">Editar</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(row.original);
            }}
          >
            <Trash2 className="size-4" />
            <span className="sr-only">Eliminar</span>
          </Button>
        </div>
      ),
    }),
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Gestiona los productos que recomiendas a tus pacientes.
        </p>
        <Button
          id="btn-nuevo-producto"
          onClick={() => setCreateOpen(true)}
        >
          <PlusIcon className="mr-2 size-4" />
          Nuevo producto
        </Button>
      </div>

      {/* Filtro por tipo */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={typeFilter === undefined ? "default" : "outline"}
          onClick={() => setTypeFilter(undefined)}
        >
          Todos
        </Button>
        <Button
          size="sm"
          variant={typeFilter === "product" ? "default" : "outline"}
          onClick={() => setTypeFilter("product")}
        >
          Productos
        </Button>
        <Button
          size="sm"
          variant={typeFilter === "supplement" ? "default" : "outline"}
          onClick={() => setTypeFilter("supplement")}
        >
          Suplementos
        </Button>
      </div>

      {/* Tabla */}
      {isLoading && (
        <p className="text-sm text-muted-foreground">Cargando productos...</p>
      )}
      {products && (
        <DataTable
          columns={columns}
          data={products}
          searchPlaceholder="Buscar producto..."
          emptyMessage="No hay productos aún. Crea uno para empezar."
        />
      )}

      {/* Dialogs */}
      {createOpen && (
        <CreateProductDialog onClose={() => setCreateOpen(false)} />
      )}
      {editTarget && (
        <EditProductDialog
          product={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* Confirmar eliminar */}
      {deleteTarget && (
        <Dialog open onOpenChange={() => setDeleteTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Eliminar producto?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Se eliminará{" "}
              <strong>&ldquo;{deleteTarget.productName}&rdquo;</strong>{" "}
              permanentemente.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  await deleteMutation.mutateAsync(deleteTarget.id);
                  setDeleteTarget(null);
                }}
              >
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
