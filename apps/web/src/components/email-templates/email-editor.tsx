"use client";

import { useRef, useState, type RefObject } from "react";
import {
  AlignCenter,
  AlignLeft,
  Bold,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Underline,
} from "lucide-react";
import {
  alineacionDe,
  alinearImagen,
  EmailImageToolbar,
  quitarImagen,
  type Alineacion,
} from "@/components/email-templates/email-image-toolbar";
import {
  uploadEmailBanner,
  type EmailTemplateVariable,
} from "@/lib/queries/email-templates";

/** Ancho útil del cuerpo del correo: 480 de la caja de `renderBrandedEmail`
 * menos 28 + 28 de padding. Outlook ignora `max-width`, así que el ancho real
 * de la imagen va en el atributo `width`, con este tope. */
const ANCHO_MAX_CORREO = 424;

function anchoParaCorreo(url: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () =>
      resolve(Math.min(img.naturalWidth || ANCHO_MAX_CORREO, ANCHO_MAX_CORREO));
    img.onerror = () => resolve(ANCHO_MAX_CORREO);
    img.src = url;
  });
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

/**
 * El `contentEditable` y sus barras. El estado del cuerpo vive en el
 * workspace: aquí solo se edita el DOM y se avisa con `onSync`.
 */
export function EmailEditor({
  editorRef,
  variables,
  onSync,
  onError,
}: {
  editorRef: RefObject<HTMLDivElement | null>;
  variables: EmailTemplateVariable[];
  onSync: () => void;
  onError: (mensaje: string) => void;
}) {
  const archivoRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  // El nodo va en un ref y no en estado: la barra lo MUTA (alinear,
  // reemplazar, quitar), y el estado de React no se muta. En estado queda
  // solo lo que se pinta.
  const imagenRef = useRef<HTMLImageElement | null>(null);
  const [seleccion, setSeleccion] = useState<{
    alineacion: Alineacion | null;
  } | null>(null);
  /** Si el próximo archivo reemplaza la imagen seleccionada. */
  const [reemplazando, setReemplazando] = useState(false);

  function seleccionar(img: HTMLImageElement | null) {
    imagenRef.current = img;
    setSeleccion(img ? { alineacion: alineacionDe(img) } : null);
  }

  /** La imagen seleccionada, si sigue en el editor. Si el editor se rehidrató
   * («volver al default», «cancelar») el nodo quedó fuera y se suelta. */
  function imagenViva(): HTMLImageElement | null {
    const img = imagenRef.current;
    if (img?.isConnected) return img;
    seleccionar(null);
    return null;
  }

  function runCommand(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    onSync();
  }

  function insertVariable(token: string) {
    if (!token || !editorRef.current) return;
    editorRef.current.focus();
    document.execCommand("insertText", false, token);
    onSync();
  }

  function insertarImagen(url: string, ancho: number) {
    const editor = editorRef.current;
    if (!editor) return;
    const safeUrl = url.replace(/"/g, "&quot;");
    const html = `<p style="margin:0 0 16px;"><img src="${safeUrl}" alt="Banner" width="${ancho}" style="display:inline-block;max-width:100%;height:auto;border:0;outline:none;" /></p>`;
    editor.focus();
    if (!document.execCommand("insertHTML", false, html)) {
      editor.innerHTML = `${html}${editor.innerHTML}`;
    }
    onSync();
  }

  async function handleArchivo(file: File | undefined) {
    if (!file) return;
    setSubiendo(true);
    try {
      const { url } = await uploadEmailBanner(file);
      const ancho = await anchoParaCorreo(url);
      const aReemplazar = reemplazando ? imagenViva() : null;
      if (aReemplazar) {
        aReemplazar.src = url;
        aReemplazar.setAttribute("width", String(ancho));
        onSync();
      } else {
        insertarImagen(url, ancho);
      }
    } catch (error) {
      onError(
        error instanceof Error ? error.message : "No se pudo subir la imagen.",
      );
    } finally {
      setSubiendo(false);
      setReemplazando(false);
      if (archivoRef.current) archivoRef.current.value = "";
    }
  }

  function elegirArchivo(paraReemplazar: boolean) {
    setReemplazando(paraReemplazar);
    archivoRef.current?.click();
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/40 px-2 py-1.5">
        <ToolbarButton label="Negrita" onClick={() => runCommand("bold")}>
          <Bold className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Cursiva" onClick={() => runCommand("italic")}>
          <Italic className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Subrayado" onClick={() => runCommand("underline")}>
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
        <ToolbarButton label="Centrar" onClick={() => runCommand("justifyCenter")}>
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
          label={subiendo ? "Subiendo imagen…" : "Insertar banner / imagen"}
          onClick={() => elegirArchivo(false)}
        >
          <ImageIcon className="size-3.5" />
        </ToolbarButton>
        <input
          ref={archivoRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void handleArchivo(e.target.files?.[0])}
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

      {seleccion ? (
        <EmailImageToolbar
          alineacion={seleccion.alineacion}
          subiendo={subiendo}
          onAlinear={(alineacion: Alineacion) => {
            const img = imagenViva();
            if (!img) return;
            alinearImagen(img, alineacion);
            setSeleccion({ alineacion });
            onSync();
          }}
          onReemplazar={() => elegirArchivo(true)}
          onEliminar={() => {
            const img = imagenViva();
            if (!img) return;
            quitarImagen(img);
            seleccionar(null);
            onSync();
          }}
        />
      ) : (
        <p className="border-b border-border px-3 py-1.5 text-xs text-muted-foreground">
          Haz clic en una imagen para alinearla, reemplazarla o eliminarla.
        </p>
      )}

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={onSync}
        onBlur={onSync}
        onClick={(e) =>
          seleccionar(e.target instanceof HTMLImageElement ? e.target : null)
        }
        className="min-h-100 overflow-auto px-5 py-4 text-sm outline-none [&_a]:text-primary [&_img]:cursor-pointer [&_img:hover]:outline-2 [&_img:hover]:outline-primary"
      />
    </div>
  );
}
