/** Exportación CSV en el cliente — sin dependencias. */

function escapeCell(value: string | number | null | undefined): string {
  if (value == null) return "";
  const text = String(value);
  // Comillas, comas y saltos de línea obligan a envolver entre comillas.
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

/**
 * Descarga `rows` como CSV. La primera fila se trata como encabezado.
 * Lleva BOM para que Excel en español abra los acentos correctamente.
 */
export function downloadCsv(
  filename: string,
  rows: (string | number | null)[][],
): void {
  const csv = rows.map((row) => row.map(escapeCell).join(",")).join("\r\n");
  const blob = new Blob([`﻿${csv}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
