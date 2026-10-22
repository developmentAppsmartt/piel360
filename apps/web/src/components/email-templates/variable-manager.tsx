"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";
import {
  useCreateEmailTemplateVariable,
  useDeleteEmailTemplateVariable,
  useUpdateEmailTemplateVariable,
  type EmailTemplateVariable,
} from "@/lib/queries/email-templates";

export function VariableManager({
  variables,
}: {
  variables: EmailTemplateVariable[];
}) {
  const createMutation = useCreateEmailTemplateVariable();
  const updateMutation = useUpdateEmailTemplateVariable();
  const deleteMutation = useDeleteEmailTemplateVariable();
  const [draftKey, setDraftKey] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftSample, setDraftSample] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKey, setEditKey] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSample, setEditSample] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setError(null);
    try {
      await createMutation.mutateAsync({
        key: draftKey,
        description: draftDescription,
        sampleValue: draftSample || null,
      });
      setDraftKey("");
      setDraftDescription("");
      setDraftSample("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear");
    }
  }

  async function handleUpdate(id: string) {
    setError(null);
    try {
      await updateMutation.mutateAsync({
        id,
        input: {
          key: editKey,
          description: editDescription,
          sampleValue: editSample || null,
        },
      });
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar");
    }
  }

  return (
    <ModuleCard className="space-y-4 p-5">
      <div>
        <ModuleCardTitle>Variables</ModuleCardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Crea las variables que quieras usar en tus plantillas (p. ej.{" "}
          <code className="text-xs">nombre</code>). Luego insértalas desde el
          editor.
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4">
        <p className="mb-3 text-sm font-medium">Nueva variable</p>
        <div className="grid gap-3 md:grid-cols-3">
          <input
            value={draftKey}
            onChange={(e) => setDraftKey(e.target.value)}
            placeholder="clave (ej. promo_code)"
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          />
          <input
            value={draftDescription}
            onChange={(e) => setDraftDescription(e.target.value)}
            placeholder="Descripción"
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          />
          <input
            value={draftSample}
            onChange={(e) => setDraftSample(e.target.value)}
            placeholder="Valor de ejemplo (opcional)"
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <Button
          type="button"
          size="sm"
          className="mt-3"
          onClick={() => void handleCreate()}
          disabled={
            createMutation.isPending ||
            !draftKey.trim() ||
            draftDescription.trim().length < 2
          }
        >
          <Plus className="size-3.5" />
          Crear variable
        </Button>
      </div>

      <ul className="space-y-2">
        {variables.map((variable) => {
          const isEditing = editingId === variable.id;
          return (
            <li
              key={`${variable.isSystem ? "sys" : "custom"}-${variable.key}-${variable.id ?? ""}`}
              className="rounded-xl border border-border px-3 py-3"
            >
              {isEditing && variable.id ? (
                <div className="space-y-3">
                  <div className="grid gap-2 md:grid-cols-3">
                    <input
                      value={editKey}
                      onChange={(e) => setEditKey(e.target.value)}
                      className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                    />
                    <input
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                    />
                    <input
                      value={editSample}
                      onChange={(e) => setEditSample(e.target.value)}
                      placeholder="Valor de ejemplo"
                      className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void handleUpdate(variable.id!)}
                      disabled={updateMutation.isPending}
                    >
                      Guardar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                        {variable.key}
                      </code>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {variable.description}
                    </p>
                    {variable.sampleValue ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Ejemplo: {variable.sampleValue}
                      </p>
                    ) : null}
                  </div>
                  {variable.id ? (
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(variable.id);
                          setEditKey(variable.key);
                          setEditDescription(variable.description);
                          setEditSample(variable.sampleValue ?? "");
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => {
                          if (
                            window.confirm(
                              `¿Eliminar la variable ${variable.key}?`,
                            )
                          ) {
                            void deleteMutation.mutateAsync(variable.id!);
                          }
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </ModuleCard>
  );
}
