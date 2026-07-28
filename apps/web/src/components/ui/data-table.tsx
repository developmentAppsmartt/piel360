"use client";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

/** Tabla genérica ordenable + con búsqueda global, sobre TanStack Table —
 * extraída de `patients-table.tsx`/`analyses-table.tsx` (mismo cableado
 * duplicado en ambas) para no repetirlo en cada tabla nueva del sistema. */
export function DataTable<TData>({
  columns,
  data,
  searchPlaceholder,
  emptyMessage,
  getRowHref,
  initialSorting = [],
}: {
  // `any` deliberado: las columnas de una misma tabla suelen mezclar
  // accessors de distintos tipos de valor (string, boolean, columnas
  // `display` sin valor) — forzar un único TValue para todo el arreglo
  // rompe la inferencia de `createColumnHelper` sin aportar seguridad real
  // acá (cada columna ya está tipada en su propio archivo).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<TData, any>[];
  data: TData[];
  searchPlaceholder: string;
  emptyMessage: string;
  /** Devuelve la URL de destino al hacer click en una fila, o `null`/`undefined`
   * para desactivar la navegación en esa fila. Si se omite, ninguna fila navega. */
  getRowHref?: (row: TData) => string | null | undefined;
  initialSorting?: SortingState;
}) {
  const router = useRouter();
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE_OPTIONS[0],
  });

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter, sorting, pagination },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-4">
      <input
        value={globalFilter}
        onChange={(e) => {
          setGlobalFilter(e.target.value);
          setPagination((prev) => ({ ...prev, pageIndex: 0 }));
        }}
        placeholder={searchPlaceholder}
        className="w-full max-w-xs rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
      />

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="cursor-pointer select-none"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{ asc: " ↑", desc: " ↓" }[header.column.getIsSorted() as string] ?? null}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => {
                const href = getRowHref?.(row.original);
                return (
                  <TableRow
                    key={row.id}
                    className={href ? "cursor-pointer" : undefined}
                    onClick={href ? () => router.push(href) : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {table.getPageCount() > 0 && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Filas por página</span>
            <select
              value={pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:border-ring"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Página {pagination.pageIndex + 1} de {table.getPageCount()}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
              >
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
