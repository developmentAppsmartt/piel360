"use client";

import DOMPurify from "dompurify";
import type { SkiniverDiagnosisCandidate } from "@piel360/shared";
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
  onClose,
}: {
  item: SkiniverDiagnosisCandidate | null;
  onClose: () => void;
}) {
  const entry = useEncyclopediaByUrl(item?.atlas_page_link);

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {item && (
          <>
            <DialogHeader>
              <DialogTitle>{item.class}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Probabilidad: {Math.round(normalizedProb(item.prob))}%
              {item.desease && ` — ${item.desease}`}
            </p>

            {!item.atlas_page_link && (
              <p className="text-sm text-muted-foreground">
                No hay artículo de enciclopedia asociado a este diagnóstico.
              </p>
            )}
            {item.atlas_page_link && entry.isLoading && (
              <p className="text-sm text-muted-foreground">Cargando artículo...</p>
            )}
            {item.atlas_page_link && !entry.isLoading && !entry.data?.content && (
              <p className="text-sm text-muted-foreground">
                Artículo aún no disponible — vuelve a intentarlo en unos minutos.
              </p>
            )}
            {entry.data?.content && (
              <div
                className="max-h-96 overflow-y-auto text-sm [&_img]:max-w-full [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(entry.data.content) }}
              />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
