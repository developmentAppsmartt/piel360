"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EmailEditor } from "@/components/email-templates/email-editor";
import { EmailIntegrations } from "@/components/email-templates/email-integrations";
import { EmailPreview } from "@/components/email-templates/email-preview";
import { TemplateFields } from "@/components/email-templates/template-fields";
import { TemplatePicker } from "@/components/email-templates/template-picker";
import { TemplateEditorHeader, type EditorTab } from "@/components/email-templates/template-editor-header";
import { TemplateSaveBar } from "@/components/email-templates/template-save-bar";
import { TemplatesPageHeader } from "@/components/email-templates/templates-page-header";
import { VariableManager } from "@/components/email-templates/variable-manager";
import { ModuleCard } from "@/components/ui/module-card";
import {
  useCreateEmailTemplate,
  useDeleteEmailTemplate,
  useEmailTemplateByKind,
  useEmailTemplateMeta,
  useEmailTemplates,
  useUpdateEmailTemplate,
  type EmailTemplate,
  type EmailTemplateOrDefault,
} from "@/lib/queries/email-templates";

const EMPTY_BODY_HTML = `<p style="margin:0 0 12px;font-size:16px;">Hola {nombre},</p>
<p style="margin:0;line-height:1.55;font-size:15px;">Escribe aquí el contenido de tu correo. Usa el botón de imagen para insertar un banner.</p>`;

/** Los eventos del panel clínico que disparan un envío hoy (ver
 * report-email.service, appointment-email.service, patient-invite.service
 * —que manda los dos del alta de paciente— y team-invite-email.service en la
 * API) — el doctor elige cuál está
 * viendo/editando en vez de navegar una lista plana.
 *
 * El panel admin monta este mismo editor con los eventos de moderación
 * (`apps/web/src/app/admin/(panel)/plantillas-correo`). La página del doctor
 * quita `team_member_invitation` a quien no es empresa: solo una empresa
 * administra un equipo. */
export const DOCTOR_EVENT_KIND_IDS = [
  "appointment_scheduled",
  "appointment_reminder",
  "report_ready",
  "patient_account_created",
  "patient_invitation",
  "team_member_invitation",
] as const;

export function EmailTemplatesWorkspace({
  eventKinds,
}: {
  eventKinds: readonly string[];
}) {
  const { data: templates, isLoading } = useEmailTemplates();
  const { data: meta } = useEmailTemplateMeta();
  const createMutation = useCreateEmailTemplate();
  const updateMutation = useUpdateEmailTemplate();
  const deleteMutation = useDeleteEmailTemplate();

  const [mode, setMode] = useState<"event" | "custom">("event");
  const [activeKind, setActiveKind] = useState<string>(eventKinds[0]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<EditorTab>("edit");
  const [dirty, setDirty] = useState(false);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [isActive, setIsActive] = useState(true);
  // Solo el recordatorio de cita lo tiene; en las demás plantillas es null.
  const [daysBefore, setDaysBefore] = useState<number | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef(false);
  const hydratedKeyRef = useRef<string | null>(null);

  const variables = meta?.variables ?? [];

  const byKindQuery = useEmailTemplateByKind(mode === "event" ? activeKind : null);

  const customSelected = useMemo(() => {
    if (!templates?.length) return null;
    if (selectedId) {
      const found = templates.find((t) => t.id === selectedId);
      if (found) return found;
    }
    return templates[0] ?? null;
  }, [templates, selectedId]);

  const selected: EmailTemplate | EmailTemplateOrDefault | null =
    mode === "event" ? (byKindQuery.data ?? null) : customSelected;

  // Identifica de forma estable QUÉ se está editando — a diferencia de
  // `selected?.id` (que es `null` para cualquier default sin personalizar,
  // así que cambiar de pestaña entre dos defaults no dispararía la
  // rehidratación del editor).
  const editingKey = mode === "event" ? `kind:${activeKind}` : selected?.id ?? null;

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
    // `selected` puede llegar en un render posterior a que cambie
    // `editingKey` (la plantilla del kind activo todavía está cargando) —
    // se reintenta en cada render hasta que llegue, sin re-hidratar de más
    // una vez que ya se hizo para esta key.
    if (!selected || hydratedKeyRef.current === editingKey) return;
    hydratedKeyRef.current = editingKey;
    if (mode === "custom") setSelectedId(selected.id);
    setName(selected.name);
    setSubject(selected.subject);
    setPreheader(selected.preheader ?? "");
    setIsActive(selected.isActive);
    setDaysBefore(selected.daysBefore);
    setDirty(false);
    setSaveMsg(null);
    hydrateEditor(selected.bodyHtml);
  }, [editingKey, selected]); // eslint-disable-line react-hooks/exhaustive-deps

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
      setMode("custom");
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
    if (!selected?.id) return;
    const confirmMsg =
      mode === "event"
        ? `¿Volver «${selected.name}» a su contenido por defecto? Se borra la personalización guardada.`
        : `¿Eliminar la plantilla «${selected.name}»? Esta acción no se puede deshacer.`;
    if (!window.confirm(confirmMsg)) return;
    try {
      await deleteMutation.mutateAsync(selected.id);
      // Sin esto el editor seguía mostrando la personalización borrada: en
      // modo evento `editingKey` no cambia, así que el efecto de hidratación
      // salía por su `return` temprano y nunca cargaba el default.
      hydratedKeyRef.current = null;
      setSelectedId(null);
      setDirty(false);
      setSaveMsg(mode === "event" ? "Se volvió al contenido por defecto." : "Plantilla eliminada.");
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
    const input = {
      name: name.trim(),
      subject: subject.trim(),
      preheader: preheader.trim() || null,
      bodyHtml: html,
      isActive,
      ...(daysBefore != null ? { daysBefore } : {}),
    };
    try {
      if (selected.id == null) {
        // Primera vez que se personaliza esta plantilla de evento (hoy usa
        // el default) — se crea con el kind explícito para poder buscarla
        // después (EmailTemplatesService.findActiveByKind).
        await createMutation.mutateAsync({
          ...input,
          preheader: input.preheader ?? undefined,
          kind: activeKind,
        });
      } else {
        await updateMutation.mutateAsync({ id: selected.id, input });
      }
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

  function applyTemplate(tpl: EmailTemplate | EmailTemplateOrDefault) {
    setName(tpl.name);
    setSubject(tpl.subject);
    setPreheader(tpl.preheader ?? "");
    setIsActive(tpl.isActive);
    setDaysBefore(tpl.daysBefore);
    hydrateEditor(tpl.bodyHtml);
  }

  function handleCancel() {
    if (!selected) return;
    applyTemplate(selected);
    setDirty(false);
    setSaveMsg(null);
  }

  return (
    <div className="space-y-6">
      <TemplatesPageHeader
        selectedName={selected?.name ?? null}
        isActive={isActive}
        onActiveChange={(activa) => {
          setIsActive(activa);
          markDirty();
        }}
        showCreate={mode === "custom"}
        onCreate={() => void handleCreate()}
        creating={createMutation.isPending}
      />

      <EmailIntegrations
        googleMessage={meta?.integrations.google.message}
        providerMessage={meta?.integrations.mailProvider.message}
      />

      <TemplatePicker
        eventKinds={eventKinds}
        kindLabel={(kindId) =>
          meta?.kinds.find((k) => k.id === kindId)?.label ?? kindId
        }
        mode={mode}
        activeKind={activeKind}
        onPickKind={(kindId) => {
          setMode("event");
          setActiveKind(kindId);
          setTab("edit");
        }}
        onShowCustom={() => {
          setMode("custom");
          setSelectedId(null);
          setTab("edit");
        }}
        customTemplates={(templates ?? []).filter(
          (tpl) => !eventKinds.includes(tpl.kind),
        )}
        isLoading={isLoading}
        selectedId={mode === "custom" ? (selected?.id ?? null) : null}
        onPickCustom={setSelectedId}
        onCreate={() => void handleCreate()}
        creating={createMutation.isPending}
      />

      {!selected ? (
        (templates ?? []).length ? (
          <ModuleCard className="p-6 text-sm text-muted-foreground">
            Selecciona una plantilla para editarla.
          </ModuleCard>
        ) : null
      ) : (
        <div className="space-y-5">
          <TemplateEditorHeader
            name={selected.name}
            isDefault={"isDefault" in selected && selected.isDefault}
            canDelete={selected.id != null}
            deleteLabel={mode === "event" ? "Volver al default" : "Eliminar"}
            deleting={deleteMutation.isPending}
            onDelete={() => void handleDelete()}
            tab={tab}
            onTab={setTab}
          />

          {tab === "variables" ? (
            <VariableManager variables={variables} />
          ) : tab === "preview" ? (
            <EmailPreview
              bodyHtml={bodyHtml}
              subject={subject}
              preheader={preheader}
              variables={variables}
              mailConnected={Boolean(meta?.integrations.mailProvider.connected)}
            />
          ) : (
            <TemplateFields
              subject={subject}
              onSubject={(valor) => {
                setSubject(valor);
                markDirty();
              }}
              preheader={preheader}
              onPreheader={(valor) => {
                setPreheader(valor);
                markDirty();
              }}
              name={name}
              onName={(valor) => {
                setName(valor);
                markDirty();
              }}
              daysBefore={daysBefore}
              onDaysBefore={(valor) => {
                setDaysBefore(valor);
                markDirty();
              }}
            >
              <EmailEditor
                key={editingKey}
                editorRef={editorRef}
                variables={variables}
                onSync={syncBodyFromEditor}
                onError={setSaveMsg}
              />
            </TemplateFields>
          )}

          <TemplateSaveBar
            message={saveMsg}
            dirty={dirty}
            saving={updateMutation.isPending}
            onCancel={handleCancel}
            onSave={() => void handleSave()}
          />
        </div>
      )}
    </div>
  );
}
