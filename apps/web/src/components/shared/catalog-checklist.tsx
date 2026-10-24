"use client";

import { useMemo, useState } from "react";
import { ImageIcon, Search, type LucideIcon } from "lucide-react";
import { normalizeText } from "@/lib/normalize-text";
import { cn } from "@/lib/utils";

export interface CatalogOption {
  id: string;
  label: string;
  /** Segunda línea: categoría, número de pasos… También entra en la búsqueda. */
  hint: string;
  /** Solo productos: con la miniatura se reconocen antes que por el nombre. */
  imageUrl?: string | null;
}

export function productCatalogOption(product: {
  id: string;
  productName: string;
  imageUrl: string | null;
  category?: { categoryName: string } | null;
}): CatalogOption {
  return {
    id: product.id,
    label: product.productName,
    hint: product.category?.categoryName ?? "Producto",
    imageUrl: product.imageUrl,
  };
}

/**
 * Lista marcable de lo ya creado en el catálogo, con buscador. La usan las
 * reglas por edad de piel y por fototipo, los pasos de rutina y los productos
 * de un tratamiento. Para elegir uno solo, quien la usa se queda con el último
 * id de `onChange`.
 */
export function CatalogChecklist({
  title,
  icon: Icon,
  options,
  selectedIds,
  onChange,
  emptyHint,
  loading,
}: {
  title: string;
  icon: LucideIcon;
  options: CatalogOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  emptyHint: string;
  loading?: boolean;
}) {
  const [query, setQuery] = useState("");
  const showImages = options.some((option) => option.imageUrl !== undefined);

  const visible = useMemo(() => {
    const q = normalizeText(query.trim());
    if (!q) return options;
    return options.filter((option) =>
      normalizeText(`${option.label} ${option.hint}`).includes(q),
    );
  }, [options, query]);

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((value) => value !== id)
        : [...selectedIds, id],
    );
  }

  return (
    <div className="rounded-xl border border-border p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-2 text-sm font-medium">
          <Icon className="size-4 text-primary" />
          {title}
        </p>
        <span className="text-xs text-muted-foreground">
          {selectedIds.length} seleccionado{selectedIds.length === 1 ? "" : "s"}
        </span>
      </div>
      {loading ? (
        <p className="py-3 text-center text-xs text-muted-foreground">Cargando…</p>
      ) : options.length === 0 ? (
        <p className="py-3 text-center text-xs text-muted-foreground">{emptyHint}</p>
      ) : (
        <>
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Buscar en ${title.toLowerCase()}…`}
              aria-label={`Buscar en ${title.toLowerCase()}`}
              className="h-9 w-full rounded-lg border border-border bg-background pr-3 pl-8 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          {visible.length === 0 ? (
            <p className="py-3 text-center text-xs text-muted-foreground">
              Sin resultados para «{query.trim()}».
            </p>
          ) : (
            <div className="max-h-56 space-y-1.5 overflow-y-auto">
              {visible.map((option) => {
                const active = selectedIds.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggle(option.id)}
                    aria-pressed={active}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      active
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30",
                    )}
                  >
                    {showImages ? (
                      option.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={option.imageUrl}
                          alt=""
                          className="size-9 shrink-0 rounded-md border border-border object-cover"
                        />
                      ) : (
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                          <ImageIcon className="size-4" />
                        </span>
                      )
                    ) : null}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{option.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {option.hint}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "size-4 shrink-0 rounded border",
                        active ? "border-primary bg-primary" : "border-muted-foreground/40",
                      )}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
