"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AnalysisListItem } from "@/lib/queries/analyses";

const columnHelper = createColumnHelper<AnalysisListItem>();

const columns = [
  columnHelper.accessor((row) => `${row.patient.firstName} ${row.patient.lastName}`, {
    id: "patient",
    header: "Paciente",
  }),
  columnHelper.accessor((row) => (row.youcamTaskId ? "YouCam" : "Skiniver"), {
    id: "provider",
    header: "Proveedor",
    cell: (info) => <Badge variant="outline">{info.getValue()}</Badge>,
  }),
  columnHelper.accessor((row) => row.finalDiagnosis ?? row.aiDiagnosis, {
    id: "diagnosis",
    header: "Diagnóstico",
    cell: (info) => info.getValue() ?? "—",
  }),
  columnHelper.display({
    id: "status",
    header: "Estado",
    cell: ({ row }) => {
      const a = row.original;
      if (!a.isValid) return <Badge variant="destructive">Inválido</Badge>;
      if (a.isConfirmed) return <Badge>{a.isCorrected ? "Corregido" : "Confirmado"}</Badge>;
      return <Badge variant="secondary">Pendiente</Badge>;
    },
  }),
  columnHelper.accessor("createdAt", {
    header: "Fecha",
    cell: (info) => new Date(info.getValue()).toLocaleDateString("es-CO"),
  }),
];

export function AnalysesTable({ analyses }: { analyses: AnalysisListItem[] }) {
  const router = useRouter();
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);

  const table = useReactTable({
    data: analyses,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-4">
      <input
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.target.value)}
        placeholder="Buscar por paciente o diagnóstico..."
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
                  Sin análisis.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() =>
                    router.push(`/doctor/pacientes/${row.original.patientId}/analisis/${row.original.id}`)
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
