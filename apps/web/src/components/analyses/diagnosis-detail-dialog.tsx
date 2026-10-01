"use client";

import Image from "next/image";
import {
  skiniverCategoryLabel,
  skiniverDiagnosisLabel,
  type SkiniverCandidateDetails,
  type SkiniverDiagnosisCandidate,
} from "@piel360/shared";
import { SkiniverDescriptive } from "@/components/analyses/skiniver-descriptive";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEncyclopediaByUrl } from "@/lib/queries/analyses";

function normalizedProb(prob: number) {
  return prob <= 1 ? prob * 100 : prob;
}

export function DiagnosisDetailDialog({
  item,
  details,
  onClose,
}: {
  item: SkiniverDiagnosisCandidate | null;
  /** Descriptivo de ESTE candidato (`skiniverDiagnosis.candidates`). Cada
   * `topn[]` trae el suyo; no es el del diagnóstico principal. */
  details?: SkiniverCandidateDetails | null;
  onClose: () => void;
}) {
  const entry = useEncyclopediaByUrl(item?.atlas_page_link);

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        {item && (
          <>
            <DialogHeader>
              <Image
                src="/logo-piel360.png"
                alt="Piel360"
                width={575}
                height={210}
                className="mb-1 h-auto w-32"
              />
              <DialogTitle>
                {skiniverDiagnosisLabel(item.class, item.class_raw)}
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Probabilidad: {Math.round(normalizedProb(item.prob))}%
              {item.desease && ` — ${skiniverCategoryLabel(item.desease)}`}
            </p>

            {details ? (
              <div className="space-y-3 rounded-xl border border-border p-4">
                <SkiniverDescriptive
                  details={details}
                  icdCode={details.icd_code}
                />
              </div>
            ) : null}

            {!item.atlas_page_link && (
              <p className="text-sm text-muted-foreground">
                No hay artículo de enciclopedia asociado a este diagnóstico.
              </p>
            )}
            {item.atlas_page_link && entry.isLoading && (
              <p className="text-sm text-muted-foreground">Cargando artículo...</p>
            )}
            {item.atlas_page_link && !entry.isLoading && !entry.data?.title && (
              <p className="text-sm text-muted-foreground">
                Artículo aún no disponible — vuelve a intentarlo en unos minutos.
              </p>
            )}
            {entry.data?.title && (
              <p className="text-sm font-medium text-foreground">{entry.data.title}</p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
