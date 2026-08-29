"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  comparisonNotesStorageKey,
  emptyComparisonNotes,
  type ComparisonMode,
  type ComparisonNotes,
} from "@/lib/patient-comparison";

function readNotes(key: string): ComparisonNotes {
  if (typeof window === "undefined") return emptyComparisonNotes();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return emptyComparisonNotes();
    const parsed = JSON.parse(raw) as Partial<ComparisonNotes>;
    return {
      general: typeof parsed.general === "string" ? parsed.general : "",
      categories:
        parsed.categories && typeof parsed.categories === "object"
          ? parsed.categories
          : {},
    };
  } catch {
    return emptyComparisonNotes();
  }
}

export function useComparisonNotes({
  patientId,
  mode,
  initialId,
  currentId,
}: {
  patientId: string;
  mode: ComparisonMode;
  initialId: string | null;
  currentId: string | null;
}) {
  const storageKey = comparisonNotesStorageKey(
    patientId,
    mode,
    initialId,
    currentId,
  );
  const [notes, setNotes] = useState<ComparisonNotes>(emptyComparisonNotes);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setNotes(readNotes(storageKey));
  }, [storageKey]);

  const persist = useCallback(
    (next: ComparisonNotes) => {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    },
    [storageKey],
  );

  const updateNotes = useCallback(
    (updater: (prev: ComparisonNotes) => ComparisonNotes) => {
      setNotes((prev) => {
        const next = updater(prev);
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => persist(next), 400);
        return next;
      });
    },
    [persist],
  );

  const setGeneralNote = useCallback(
    (general: string) => {
      updateNotes((prev) => ({ ...prev, general }));
    },
    [updateNotes],
  );

  const setCategoryNote = useCallback(
    (categoryId: string, value: string) => {
      updateNotes((prev) => ({
        ...prev,
        categories: { ...prev.categories, [categoryId]: value },
      }));
    },
    [updateNotes],
  );

  return {
    notes,
    setGeneralNote,
    setCategoryNote,
  };
}
