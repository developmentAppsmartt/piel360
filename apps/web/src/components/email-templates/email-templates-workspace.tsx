"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  AlignLeft,
  AlignCenter,
  ImageIcon,
  Monitor,
  Smartphone,
  Mail,
  CloudOff,
  ChevronRight,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModuleCard, ModuleCardTitle } from "@/components/ui/module-card";
import { cn } from "@/lib/utils";
import {
  uploadEmailBanner,
  useCreateEmailTemplate,
  useCreateEmailTemplateVariable,
  useDeleteEmailTemplate,
  useDeleteEmailTemplateVariable,
  useEmailTemplateMeta,
  useEmailTemplates,
  useUpdateEmailTemplate,
  useUpdateEmailTemplateVariable,
  type EmailTemplate,
  type EmailTemplateVariable,
} from "@/lib/queries/email-templates";

const EMPTY_BODY_HTML = `<p style="margin:0 0 12px;font-size:16px;">Hola {nombre},</p>
<p style="margin:0;line-height:1.55;font-size:15px;">Escribe aquí el contenido de tu correo. Usa el botón de imagen para insertar un banner.</p>`;

type EditorTab = "edit" | "variables";
type PreviewMode = "desktop" | "mobile";

const DEFAULT_PREVIEW_SAMPLES: Record<string, string> = {
  "{nombre}": "Ana",
  "{apellido}": "García",
  "{email}": "ana@ejemplo.com",
  "{plan_name}": "Plan Profesional",
  "{clinic_name}": "Piel360 Clínica",
  "{report_url}": "#",
  "{login_url}": "#",
};

function applyPreviewVars(
  html: string,
  variables: EmailTemplateVariable[] | undefined,
) {
  const samples = { ...DEFAULT_PREVIEW_SAMPLES };
  for (const variable of variables ?? []) {
    if (variable.sampleValue) samples[variable.key] = variable.sampleValue;
  }
  let out = html;
  for (const [key, value] of Object.entries(samples)) {
    out = out.split(key).join(value);
  }
  return out;
}

function previewDocument(
  bodyHtml: string,
  variables: EmailTemplateVariable[] | undefined,
) {
  const body = applyPreviewVars(bodyHtml, variables);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
    body{margin:0;padding:16px;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#1a2b3c;}
    a{color:#1E5A9E;}
    img{max-width:100%;height:auto;display:block;border:0;}
  </style></head><body>${body}</body></html>`;
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}

function VariableManager({
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

export function EmailTemplatesWorkspace() {
  const { data: templates, isLoading } = useEmailTemplates();
  const { data: meta } = useEmailTemplateMeta();
  const createMutation = useCreateEmailTemplate();
  const updateMutation = useUpdateEmailTemplate();
  const deleteMutation = useDeleteEmailTemplate();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<EditorTab>("edit");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");
  const [dirty, setDirty] = useState(false);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const syncingRef = useRef(false);

  const variables = meta?.variables ?? [];

  const selected = useMemo(() => {
    if (!templates?.length) return null;
    if (selectedId) {
      const found = templates.find((t) => t.id === selectedId);
      if (found) return found;
    }
    return templates[0] ?? null;
  }, [templates, selectedId]);

  function hydrateEditor(html: string) {
    syncingRef.current = true;
    setBodyHtml(html);
    requestAnimationFrame(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = html;
      }
      syncingRef.current = false;
    });
  }

  function syncBodyFromEditor() {
    if (!editorRef.current || syncingRef.current) return;
    setBodyHtml(editorRef.current.innerHTML);
    setDirty(true);
    setSaveMsg(null);
  }

  useEffect(() => {
    if (!selected) return;
    setSelectedId(selected.id);
    setName(selected.name);
    setSubject(selected.subject);
    setPreheader(selected.preheader ?? "");
    setIsActive(selected.isActive);
    setDirty(false);
    setSaveMsg(null);
    hydrateEditor(selected.bodyHtml);
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab !== "edit" || !editorRef.current) return;
    if (editorRef.current.innerHTML.trim() === "" && bodyHtml) {
      hydrateEditor(bodyHtml);
    }
  }, [tab, bodyHtml]);

  function markDirty() {
    setDirty(true);
    setSaveMsg(null);
  }

  function runCommand(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncBodyFromEditor();
  }

  function insertVariable(token: string) {
    if (!token) return;
    setTab("edit");
    requestAnimationFrame(() => {
      if (editorRef.current) {
        editorRef.current.focus();
        document.execCommand("insertText", false, token);
        syncBodyFromEditor();
      } else {
        setBodyHtml((current) => `${current}${token}`);
        markDirty();
      }
    });
  }

  function insertBannerHtml(url: string) {
    const safeUrl = url.replace(/"/g, "&quot;");
    const html = `<p style="margin:0 0 16px;"><img src="${safeUrl}" alt="Banner" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;outline:none;" /></p>`;
    setTab("edit");
    requestAnimationFrame(() => {
      if (!editorRef.current) {
        setBodyHtml((current) => `${html}${current}`);
        markDirty();
        return;
      }
      editorRef.current.focus();
      const inserted = document.execCommand("insertHTML", false, html);
      if (!inserted) {
        editorRef.current.innerHTML = `${html}${editorRef.current.innerHTML}`;
      }
      syncBodyFromEditor();
    });
  }

  async function handleBannerFile(file: File | undefined) {
    if (!file) return;
    setUploadingBanner(true);
    setSaveMsg(null);
    try {
      const { url } = await uploadEmailBanner(file);
      insertBannerHtml(url);
    } catch (error) {
      setSaveMsg(
        error instanceof Error
          ? error.message
          : "No se pudo subir el banner.",
      );
    } finally {
      setUploadingBanner(false);
      if (bannerInputRef.current) bannerInputRef.current.value = "";
    }
  }

  async function handleCreate() {
    setSaveMsg(null);
    try {
      const created = await createMutation.mutateAsync({
        name: "Nueva plantilla",
        subject: "Asunto del correo",
        preheader: "Texto corto que aparece en la bandeja de entrada.",
        bodyHtml: EMPTY_BODY_HTML,
        isActive: true,
      });
      setSelectedId(created.id);
      setTab("edit");
      setSaveMsg("Plantilla creada. Personalízala y guarda los cambios.");
    } catch (error) {
      setSaveMsg(
        error instanceof Error
          ? error.message
          : "No se pudo crear la plantilla.",
      );
    }
  }

  async function handleDelete() {
    if (!selected) return;
    if (
      !window.confirm(
        `¿Eliminar la plantilla «${selected.name}»? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(selected.id);
      setSelectedId(null);
      setDirty(false);
      setSaveMsg("Plantilla eliminada.");
    } catch (error) {
      setSaveMsg(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar la plantilla.",
      );
    }
  }

  async function handleSave() {
    if (!selected) return;
    const html = editorRef.current?.innerHTML || bodyHtml;
    try {
      await updateMutation.mutateAsync({
        id: selected.id,
        input: {
          name: name.trim(),
          subject: subject.trim(),
          preheader: preheader.trim() || null,
          bodyHtml: html,
          isActive,
        },
      });
      setBodyHtml(html);
      setDirty(false);
      setSaveMsg("Cambios guardados.");
    } catch (error) {
      setSaveMsg(
        error instanceof Error
          ? error.message
          : "No se pudieron guardar los cambios.",
      );
    }
  }

  function applyTemplate(tpl: EmailTemplate) {
    setName(tpl.name);
    setSubject(tpl.subject);
    setPreheader(tpl.preheader ?? "");
    setIsActive(tpl.isActive);
    hydrateEditor(tpl.bodyHtml);
  }

  function handleCancel() {
    if (!selected) return;
    applyTemplate(selected);
    setDirty(false);
    setSaveMsg(null);
  }

  const previewSrcDoc = previewDocument(bodyHtml, variables);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Configuración <ChevronRight className="mx-1 inline size-3.5" />{" "}
          Plantillas de correo
          {selected ? (
            <>
              {" "}
              <ChevronRight className="mx-1 inline size-3.5" /> {selected.name}
            </>
          ) : null}
        </p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Plantillas de correo
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Crea plantillas desde cero, inserta banners e variables, y
              conserva la identidad visual de Piel360.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {selected ? (
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  role="switch"
                  checked={isActive}
                  onChange={(e) => {
                    setIsActive(e.target.checked);
                    markDirty();
                  }}
                  className="size-4 accent-primary"
                />
                Plantilla activa
              </label>
            ) : null}
            <Button
              type="button"
              size="sm"
              onClick={() => void handleCreate()}
              disabled={createMutation.isPending}
            >
              <Plus className="size-3.5" />
              {createMutation.isPending ? "Creando…" : "Nueva plantilla"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ModuleCard className="space-y-3 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <CloudOff className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <ModuleCardTitle className="text-base">
                Google Workspace / Gmail
              </ModuleCardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {meta?.integrations.google.message ??
                  "Conexión pendiente. Espacio reservado para OAuth de Google."}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                disabled
              >
                Conectar Google (próximamente)
              </Button>
            </div>
          </div>
        </ModuleCard>

        <ModuleCard className="space-y-3 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Mail className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <ModuleCardTitle className="text-base">
                Proveedor de correo
              </ModuleCardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {meta?.integrations.mailProvider.message ??
                  "Espacio reservado para Resend / SMTP u otro proveedor."}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                disabled
              >
                Configurar proveedor (próximamente)
              </Button>
            </div>
          </div>
        </ModuleCard>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Plantillas
        </p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : !(templates ?? []).length ? (
          <ModuleCard className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="text-sm font-medium">Aún no hay plantillas</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Crea la primera para diseñar asunto, preencabezado, banner y
                contenido.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => void handleCreate()}
              disabled={createMutation.isPending}
            >
              <Plus className="size-3.5" />
              Crear plantilla
            </Button>
          </ModuleCard>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(templates ?? []).map((tpl) => {
              const active = tpl.id === selected?.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setSelectedId(tpl.id)}
                  className={cn(
                    "min-w-40 flex-1 rounded-xl border px-4 py-3 text-left transition-colors sm:flex-none",
                    active
                      ? "border-primary/40 bg-primary/10 text-foreground shadow-sm"
                      : "border-border bg-background hover:bg-muted/60",
                  )}
                >
                  <p className="text-sm font-medium">{tpl.name}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {tpl.subject}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {!selected ? (
        (templates ?? []).length ? (
          <ModuleCard className="p-6 text-sm text-muted-foreground">
            Selecciona una plantilla para editarla.
          </ModuleCard>
        ) : null
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">
                Editar «{selected.name}»
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleDelete()}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="size-3.5" />
                Eliminar
              </Button>
            </div>
            <div className="flex flex-wrap gap-1 rounded-xl bg-muted p-1 w-fit">
              {(
                [
                  { id: "edit", label: "Editar plantilla" },
                  { id: "variables", label: "Variables disponibles" },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                    tab === item.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {tab === "variables" ? (
            <VariableManager variables={variables} />
          ) : (
            <div className="space-y-6">
              <ModuleCard className="space-y-4 p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      1. Línea de asunto
                    </label>
                    <input
                      value={subject}
                      onChange={(e) => {
                        setSubject(e.target.value);
                        markDirty();
                      }}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      2. Preencabezado
                    </label>
                    <input
                      value={preheader}
                      onChange={(e) => {
                        setPreheader(e.target.value);
                        markDirty();
                      }}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-sm font-medium">
                      3. Contenido del correo
                    </label>
                    <input
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        markDirty();
                      }}
                      className="h-8 w-48 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-primary"
                      placeholder="Nombre interno"
                    />
                  </div>

                  <div className="overflow-hidden rounded-xl border border-border bg-background">
                    <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/40 px-2 py-1.5">
                      <ToolbarButton
                        label="Negrita"
                        onClick={() => runCommand("bold")}
                      >
                        <Bold className="size-3.5" />
                      </ToolbarButton>
                      <ToolbarButton
                        label="Cursiva"
                        onClick={() => runCommand("italic")}
                      >
                        <Italic className="size-3.5" />
                      </ToolbarButton>
                      <ToolbarButton
                        label="Subrayado"
                        onClick={() => runCommand("underline")}
                      >
                        <Underline className="size-3.5" />
                      </ToolbarButton>
                      <ToolbarButton
                        label="Lista"
                        onClick={() => runCommand("insertUnorderedList")}
                      >
                        <List className="size-3.5" />
                      </ToolbarButton>
                      <ToolbarButton
                        label="Lista numerada"
                        onClick={() => runCommand("insertOrderedList")}
                      >
                        <ListOrdered className="size-3.5" />
                      </ToolbarButton>
                      <ToolbarButton
                        label="Alinear izquierda"
                        onClick={() => runCommand("justifyLeft")}
                      >
                        <AlignLeft className="size-3.5" />
                      </ToolbarButton>
                      <ToolbarButton
                        label="Centrar"
                        onClick={() => runCommand("justifyCenter")}
                      >
                        <AlignCenter className="size-3.5" />
                      </ToolbarButton>
                      <ToolbarButton
                        label="Enlace"
                        onClick={() => {
                          const url = window.prompt("URL del enlace");
                          if (url) runCommand("createLink", url);
                        }}
                      >
                        <Link2 className="size-3.5" />
                      </ToolbarButton>
                      <ToolbarButton
                        label={
                          uploadingBanner
                            ? "Subiendo banner…"
                            : "Insertar banner / imagen"
                        }
                        onClick={() => bannerInputRef.current?.click()}
                      >
                        <ImageIcon className="size-3.5" />
                      </ToolbarButton>
                      <input
                        ref={bannerInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          void handleBannerFile(e.target.files?.[0])
                        }
                      />

                      <div className="mx-1 h-5 w-px bg-border" />

                      <label className="sr-only" htmlFor="insert-variable">
                        Insertar variable
                      </label>
                      <select
                        id="insert-variable"
                        defaultValue=""
                        onChange={(e) => {
                          insertVariable(e.target.value);
                          e.target.value = "";
                        }}
                        className="h-8 max-w-56 rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
                      >
                        <option value="" disabled>
                          Insertar variable…
                        </option>
                        {variables.map((variable) => (
                          <option key={variable.key} value={variable.key}>
                            {variable.key} — {variable.description}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div
                      key={selected.id}
                      ref={editorRef}
                      contentEditable
                      suppressContentEditableWarning
                      onInput={syncBodyFromEditor}
                      onBlur={syncBodyFromEditor}
                      className="min-h-100 overflow-auto px-5 py-4 text-sm outline-none [&_a]:text-primary"
                    />
                  </div>
                </div>
              </ModuleCard>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-semibold">
                    Vista previa del correo
                  </h3>
                  <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                    <button
                      type="button"
                      onClick={() => setPreviewMode("desktop")}
                      className={cn(
                        "rounded-md p-1.5",
                        previewMode === "desktop"
                          ? "bg-background text-primary shadow-sm"
                          : "text-muted-foreground",
                      )}
                      title="Escritorio"
                    >
                      <Monitor className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode("mobile")}
                      className={cn(
                        "rounded-md p-1.5",
                        previewMode === "mobile"
                          ? "bg-background text-primary shadow-sm"
                          : "text-muted-foreground",
                      )}
                      title="Móvil"
                    >
                      <Smartphone className="size-4" />
                    </button>
                  </div>
                </div>

                <ModuleCard className="overflow-hidden p-0">
                  <div className="space-y-1 border-b border-border bg-muted/30 px-5 py-3 text-sm text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">De:</span>{" "}
                      {meta?.integrations.mailProvider.connected
                        ? "tu-cuenta@dominio.com"
                        : "pendiente · proveedor no conectado"}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Para:</span>{" "}
                      ana@ejemplo.com
                    </p>
                    <p>
                      <span className="font-medium text-foreground">
                        Asunto:
                      </span>{" "}
                      {applyPreviewVars(subject, variables)}
                    </p>
                    {preheader ? (
                      <p className="italic">
                        {applyPreviewVars(preheader, variables)}
                      </p>
                    ) : null}
                  </div>
                  <div className="bg-[#f4f7fb] p-4 sm:p-6">
                    <div
                      className={cn(
                        "mx-auto overflow-hidden rounded-xl border border-[#d9e4f2] bg-white shadow-sm",
                        previewMode === "mobile" ? "max-w-90" : "max-w-3xl",
                      )}
                    >
                      <iframe
                        title="Vista previa del correo"
                        srcDoc={previewSrcDoc}
                        className="block h-140 w-full border-0 bg-white"
                        sandbox=""
                      />
                    </div>
                  </div>
                </ModuleCard>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
            {saveMsg ? (
              <p className="mr-auto text-sm text-muted-foreground">{saveMsg}</p>
            ) : dirty ? (
              <p className="mr-auto text-sm text-amber-700">
                Hay cambios sin guardar.
              </p>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={!dirty || updateMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={!dirty || updateMutation.isPending}
            >
              {updateMutation.isPending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
