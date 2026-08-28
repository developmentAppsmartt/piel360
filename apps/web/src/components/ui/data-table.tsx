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
import { ChevronRight, Search } from "lucide-react";
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
import { cn } from "@/lib/utils";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export function DataTable<TData>({
  columns,
  data,
  searchPlaceholder,
  emptyMessage,
  getRowHref,
  initialSorting = [],
  variant = "default",
  title,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<TData, any>[];
  data: TData[];
  searchPlaceholder: string;
  emptyMessage: string;
  getRowHref?: (row: TData) => string | null | undefined;
  initialSorting?: SortingState;
  variant?: "default" | "modern";
  title?: string;
}) {
  const router = useRouter();
  const modern = variant === "modern";
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

  const filteredCount = table.getFilteredRowModel().rows.length;
  const totalCount = data.length;

  const searchInput = (
    <div
      className={cn(
        "relative",
        modern ? "min-w-[220px] flex-1 sm:max-w-md" : "w-full max-w-xs",
      )}
    >
      {modern ? (
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      ) : null}
      <input
        value={globalFilter}
        onChange={(e) => {
          setGlobalFilter(e.target.value);
          setPagination((prev) => ({ ...prev, pageIndex: 0 }));
        }}
        placeholder={searchPlaceholder}
        className={cn(
          "w-full border border-border bg-background text-sm outline-none focus:border-ring",
          modern
            ? "h-10 rounded-xl border-input pr-3 pl-9 focus:border-primary"
            : "rounded-md px-3 py-2",
        )}
      />
    </div>
  );

  const tableContent = (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow
            key={headerGroup.id}
            className={modern ? "border-0 hover:bg-transparent" : undefined}
          >
            {headerGroup.headers.map((header) => (
              <TableHead
                key={header.id}
                onClick={header.column.getToggleSortingHandler()}
                className={cn(
                  "cursor-pointer select-none",
                  modern &&
                    "h-auto bg-muted/40 px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase",
                )}
              >
                {flexRender(header.column.columnDef.header, header.getContext())}
                {{ asc: " ↑", desc: " ↓" }[header.column.getIsSorted() as string] ??
                  null}
              </TableHead>
            ))}
            {modern && getRowHref ? (
              <TableHead className="w-10 bg-muted/40" />
            ) : null}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.length === 0 ? (
          <TableRow className={modern ? "hover:bg-transparent" : undefined}>
            <TableCell
              colSpan={columns.length + (modern && getRowHref ? 1 : 0)}
              className={cn(
                "text-center text-muted-foreground",
                modern && "px-4 py-10",
              )}
            >
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          table.getRowModel().rows.map((row) => {
            const href = getRowHref?.(row.original);
            return (
              <TableRow
                key={row.id}
                className={cn(
                  href && "cursor-pointer",
                  modern &&
                    "border-t border-border transition-colors hover:bg-muted/30",
                )}
                onClick={href ? () => router.push(href) : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={modern ? "px-4 py-3" : undefined}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
                {modern && getRowHref ? (
                  <TableCell className="px-4 py-3 text-right">
                    {href ? (
                      <ChevronRight className="ml-auto size-4 text-muted-foreground" />
                    ) : null}
                  </TableCell>
                ) : null}
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );

  const paginationBar =
    table.getPageCount() > 0 ? (
      <div
        className={cn(
          "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
          modern &&
            "border-t border-border px-4 py-3 text-xs text-muted-foreground",
        )}
      >
        {modern ? (
          <span>
            Mostrando {filteredCount} de {totalCount} resultados
          </span>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-4 sm:justify-end">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Filas por página</span>
            <select
              value={pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className={cn(
                "border border-border bg-background text-sm outline-none focus:border-ring",
                modern
                  ? "h-9 rounded-xl border-input px-2 focus:border-primary"
                  : "rounded-md px-2 py-1",
              )}
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
                className={modern ? "rounded-xl" : undefined}
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
              >
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={modern ? "rounded-xl" : undefined}
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </div>
      </div>
    ) : null;

  if (modern) {
    return (
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {(title || searchPlaceholder) && (
          <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            {title ? (
              <h2 className="text-base font-semibold text-foreground">{title}</h2>
            ) : (
              <span />
            )}
            {searchInput}
          </div>
        )}
        <div className="overflow-x-auto">{tableContent}</div>
        {paginationBar}
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {searchInput}
      <div className="rounded-lg border border-border">{tableContent}</div>
      {paginationBar}
    </div>
  );
}
