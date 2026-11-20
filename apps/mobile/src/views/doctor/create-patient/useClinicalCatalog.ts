import { useEffect, useState } from 'react';
import {
  mergeCatalogAnswers,
  type ClinicalHistoryCatalogGroup,
  type ClinicalProfileDraft,
} from '../../../data/clinicalHistoryOptions';
import { clinicalHistoryService } from '../../../services/clinical-history.service';

/** Carga el catálogo Sí/No y fusiona las claves en el borrador clínico. */
export function useClinicalCatalog(
  setClinical: (
    next: (prev: ClinicalProfileDraft) => ClinicalProfileDraft,
  ) => void,
): ClinicalHistoryCatalogGroup[] {
  const [groups, setGroups] = useState<ClinicalHistoryCatalogGroup[]>([]);

  useEffect(() => {
    let cancelled = false;
    clinicalHistoryService
      .catalog()
      .then((list) => {
        if (cancelled) return;
        setGroups(list);
        setClinical((prev) => mergeCatalogAnswers(prev, list));
      })
      .catch(() => {
        if (!cancelled) setGroups([]);
      });
    return () => {
      cancelled = true;
    };
  }, [setClinical]);

  return groups;
}
