"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AnalysesTable } from "@/components/analyses/analyses-table";
import { ApiError } from "@/lib/api-error";
import { useAnalyses } from "@/lib/queries/analyses";

export default function AnalisisPage() {
  const router = useRouter();
  const { data, isLoading, error } = useAnalyses();

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) {
      router.push("/patient/login");
    }
  }, [error, router]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Mis análisis</h1>

      {isLoading && <p className="text-muted-foreground">Cargando...</p>}
      {error && !(error instanceof ApiError && error.status === 401) && (
        <p className="text-destructive">No se pudieron cargar tus análisis.</p>
      )}
      {data && <AnalysesTable analyses={data} getHref={() => null} />}
    </div>
  );
}
