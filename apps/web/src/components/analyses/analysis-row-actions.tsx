"use client";

import Link from "next/link";
import { Download, Eye } from "lucide-react";
import { ApiError } from "@/lib/api-error";
import { useDownloadAnalisisPiel360Report } from "@/lib/queries/analyses";

const ACTION =
  "inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40";

/** El PDF solo existe para el estético: su hook es por análisis, por eso
 * vive en su propio componente. */
function DownloadReportButton({ analysisId }: { analysisId: string }) {
  const download = useDownloadAnalisisPiel360Report(analysisId);
  async function handle() {
    if (download.isPending) return;
    try {
      const { url } = await download.mutateAsync();
      window.open(url, "_blank", "noreferrer");
    } catch (err) {
      window.alert(
        err instanceof ApiError ? err.message : "No se pudo generar el reporte en PDF. Inténtalo de nuevo.",
      );
    }
  }
  return (
    <button
      type="button"
      className={ACTION}
      onClick={() => void handle()}
      disabled={download.isPending}
      title="Descargar reporte PDF"
    >
      <Download className="size-4" />
      <span className="sr-only">Descargar reporte PDF</span>
    </button>
  );
}

/** Ver y descargar desde la fila del historial. La fila entera también
 * navega, así que los clics de aquí no suben. */
export function AnalysisRowActions({
  href,
  analysisId,
  canDownload,
}: {
  href: string | null;
  analysisId: string;
  canDownload: boolean;
}) {
  return (
    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
      {href ? (
        <Link href={href} className={ACTION} title="Ver detalle">
          <Eye className="size-4" />
          <span className="sr-only">Ver detalle</span>
        </Link>
      ) : null}
      {canDownload ? <DownloadReportButton analysisId={analysisId} /> : null}
    </div>
  );
}
