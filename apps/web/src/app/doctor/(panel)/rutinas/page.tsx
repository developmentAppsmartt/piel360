"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, PlusIcon, Trash2 } from "lucide-react";
import { createColumnHelper } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RoutineOnboarding } from "@/components/routines/routine-onboarding";
import { TreatmentsListTab } from "@/components/treatments/treatments-list-tab";
import { TreatmentCategoriesTab } from "@/components/treatments/treatment-categories-tab";
import { ApiError } from "@/lib/api-error";
import { useDeleteRoutine, useRoutines, type Routine } from "@/lib/queries/routines";
import { cn } from "@/lib/utils";

const col = createColumnHelper<Routine>();

type Tab = "rutinas" | "tratamientos" | "categorias-tratamiento";

export default function RutinasPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("rutinas");
  const { data: routines, isLoading, error } = useRoutines();
  const deleteMutation = useDeleteRoutine();
  const [deleteTarget, setDeleteTarget] = useState<Routine | null>(null);

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) {
      router.push("/doctor/login");
    }
  }, [error, router]);

  const columns = [
    col.accessor("name", { header: "Nombre" }),
    col.accessor("isActive", {
      header: "Estado",
      cell: (info) =>
        info.getValue() ? <Badge>Activa</Badge> : <Badge variant="secondary">Inactiva</Badge>,
    }),
    col.accessor((r) => r.conditions.length, {
      id: "conditions",
      header: "Condiciones",
      cell: (info) => `${info.getValue()} condición${info.getValue() === 1 ? "" : "es"}`,
    }),
    col.accessor((r) => r.steps.length, {
      id: "steps",
      header: "Pasos",
      cell: (info) => `${info.getValue()} paso${info.getValue() === 1 ? "" : "s"}`,
    }),
    col.display({
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            nativeButton={false}
            render={<Link href={`/doctor/rutinas/${row.original.id}`} onClick={(e) => e.stopPropagation()} />}
          >
            <Pencil className="size-4" />
            <span className="sr-only">Editar</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(row.original);
            }}
          >
            <Trash2 className="size-4" />
            <span className="sr-only">Eliminar</span>
          </Button>
        </div>
      ),
    }),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Rutinas y tratamientos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configura rutinas y tratamientos que se recomiendan automáticamente según los
            puntajes del análisis facial del paciente.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RoutineOnboarding />
          {activeTab === "rutinas" && (
            <Button nativeButton={false} render={<Link href="/doctor/rutinas/nueva" />}>
              <PlusIcon className="mr-2 size-4" />
              Nueva rutina
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-1 rounded-xl bg-muted p-1 w-fit">
        {(
          [
            { id: "rutinas", label: "Rutinas" },
            { id: "tratamientos", label: "Tratamientos" },
            { id: "categorias-tratamiento", label: "Categorías de tratamiento" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-all",
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "tratamientos" && (
        <TreatmentsListTab kind="treatment" basePath="/doctor/rutinas/tratamientos" />
      )}

      {activeTab === "categorias-tratamiento" && <TreatmentCategoriesTab />}

      {activeTab === "rutinas" && (
        <>
          {isLoading && <p className="text-sm text-muted-foreground">Cargando rutinas...</p>}
          {routines && (
            <DataTable
              columns={columns}
              data={routines}
              searchPlaceholder="Buscar rutina..."
              emptyMessage="No hay rutinas aún. Crea una para empezar."
              getRowHref={(row) => `/doctor/rutinas/${row.id}`}
            />
          )}
        </>
      )}

      {deleteTarget && (
        <Dialog open onOpenChange={() => setDeleteTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Eliminar rutina?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Se eliminará <strong>&ldquo;{deleteTarget.name}&rdquo;</strong> permanentemente,
              junto con sus condiciones y pasos.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  await deleteMutation.mutateAsync(deleteTarget.id);
                  setDeleteTarget(null);
                }}
              >
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
