/* eslint-disable @next/next/no-img-element -- previews de blobs locales y URLs firmadas */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  ImageIcon,
  Loader2,
  Lock,
  Mail,
  RotateCcw,
  Smartphone,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import {
  BRANDING_BACKGROUND_COLORS,
  BRANDING_BASE_COLORS,
  BRANDING_BUTTON_TEXT_COLORS,
  BRANDING_PALETTES,
  BRANDING_SECONDARY_TEXT_COLORS,
  BRANDING_TEXT_COLORS,
  DEFAULT_BRANDING_COLORS,
  type BrandingColorKey,
  type BrandingColorOption,
  type BrandingColors,
} from "@piel360/shared";
import { cn } from "@/lib/utils";
import {
  type BrandingImageKind,
  useMyBranding,
  useRemoveBrandingImage,
  useUpdateBranding,
  useUploadBrandingImage,
} from "@/lib/queries/branding";

const DEFAULT_LOGIN_BACKGROUND = "/mobile-login-bg.png";
const DEFAULT_LOGIN_LOGO = "/mobile-login-logo.png";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

type ColorField = {
  key: BrandingColorKey;
  label: string;
  description: string;
  /** Colores base del campo (por defecto, BRANDING_BASE_COLORS). */
  baseOptions?: readonly BrandingColorOption[];
};

const COLOR_FIELDS: ColorField[] = [
  {
    key: "background",
    label: "Color de fondo",
    description: "Fondo de las vistas de la app (inicio, pacientes, agenda, mensajes…).",
    baseOptions: BRANDING_BACKGROUND_COLORS,
  },
  {
    key: "primary",
    label: "Color primario",
    description: "Header, fondos y acentos de la app.",
  },
  {
    key: "primaryText",
    label: "Color de texto primario",
    description: "Títulos y valores destacados de la app.",
    baseOptions: BRANDING_TEXT_COLORS,
  },
  {
    key: "secondaryText",
    label: "Color de texto secundario",
    description: "Párrafos, descripciones y datos de la app.",
    baseOptions: BRANDING_SECONDARY_TEXT_COLORS,
  },
  {
    key: "icon",
    label: "Color de iconos",
    description: "Iconos del sistema en la app.",
  },
  {
    key: "secondary",
    label: "Color secundario",
    description: "Solo en el login: textos resaltados en negrita.",
  },
  {
    key: "link",
    label: "Color de links",
    description: "Enlaces subrayados (¿Olvidaste tu contraseña?, Términos, Regístrate…).",
    baseOptions: BRANDING_BUTTON_TEXT_COLORS,
  },
  {
    key: "loginText",
    label: "Texto del login",
    description: "Letra del login y del registro que no es título (descripciones, etiquetas, casillas…).",
    baseOptions: BRANDING_BUTTON_TEXT_COLORS,
  },
  {
    key: "button",
    label: "Color de botones",
    description: "Fondo de todos los botones de la app.",
  },
  {
    key: "buttonHover",
    label: "Botones · hover",
    description: "Filtros, chips y opciones seleccionadas, y botones al presionarlos.",
  },
  {
    key: "gradientStart",
    label: "Degradado · inicio",
    description: "Primer color de los botones con degradado.",
  },
  {
    key: "gradientEnd",
    label: "Degradado · fin",
    description: "Segundo color de los botones con degradado.",
  },
  {
    key: "gradientHoverStart",
    label: "Degradado hover · inicio",
    description: "Primer color del degradado al presionar el botón.",
  },
  {
    key: "gradientHoverEnd",
    label: "Degradado hover · fin",
    description: "Segundo color del degradado al presionar el botón.",
  },
  {
    key: "buttonText",
    label: "Texto de botones",
    description: "Color de letra de los botones generales.",
    baseOptions: BRANDING_BUTTON_TEXT_COLORS,
  },
  {
    key: "gradientText",
    label: "Texto de botones con degradado",
    description: "Color de letra de los botones con degradado.",
    baseOptions: BRANDING_BUTTON_TEXT_COLORS,
  },
];

/** Imagen pendiente de guardar: archivo nuevo o volver a la del sistema. */
type PendingImage = { file: File; previewUrl: string } | "reset" | null;

function revokePreview(pending: PendingImage) {
  if (pending && pending !== "reset") URL.revokeObjectURL(pending.previewUrl);
}

function sameColors(a: BrandingColors, b: BrandingColors) {
  return COLOR_FIELDS.every(
    ({ key }) => (a[key] ?? "").toUpperCase() === (b[key] ?? "").toUpperCase(),
  );
}

const BUTTON_HOVER_CLASS =
  "cursor-pointer bg-[var(--btn)] transition-colors hover:bg-[var(--btn-hover)]";
const GRADIENT_HOVER_CLASS =
  "cursor-pointer [background-image:var(--grad)] hover:[background-image:var(--grad-hover)]";

function buttonStyle(colors: BrandingColors): CSSProperties {
  return {
    "--btn": colors.button,
    "--btn-hover": colors.buttonHover,
    color: colors.buttonText,
  } as CSSProperties;
}

function gradientButtonStyle(colors: BrandingColors): CSSProperties {
  return {
    "--grad": `linear-gradient(90deg, ${colors.gradientStart}, ${colors.gradientEnd})`,
    "--grad-hover": `linear-gradient(90deg, ${colors.gradientHoverStart}, ${colors.gradientHoverEnd})`,
    color: colors.gradientText,
  } as CSSProperties;
}

/** Texto legible sobre un color de fondo arbitrario. */
function readableOn(hex: string) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160 ? "#0F172A" : "#FFFFFF";
}

function Swatch({
  hex,
  label,
  selected,
  onClick,
  size = "md",
}: {
  hex: string;
  label: string;
  selected: boolean;
  onClick: () => void;
  size?: "sm" | "md";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${label} (${hex})`}
      aria-label={`${label} ${hex}`}
      aria-pressed={selected}
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full border border-black/10 transition",
        size === "md" ? "size-8" : "size-7",
        selected
          ? "ring-2 ring-primary ring-offset-2"
          : "hover:scale-105",
      )}
      style={{ backgroundColor: hex }}
    >
      {selected ? (
        <Check
          className="size-4"
          style={{ color: readableOn(hex) }}
          aria-hidden
        />
      ) : null}
    </button>
  );
}

/** Lee el tamaño real de la imagen antes de subirla. */
function readImageSize(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/** Ejemplo visual de logo con fondo (incorrecto) y sin fondo (correcto). */
function LogoExamples() {
  return (
    <div className="grid grid-cols-2 gap-2">
      <figure className="space-y-1">
        <div className="relative flex h-20 items-center justify-center rounded-lg bg-[#0E1A38] p-3">
          <div className="flex h-full w-full items-center justify-center rounded bg-white p-1.5">
            <img src="/logo-piel360.png" alt="" className="max-h-full w-auto object-contain" />
          </div>
          <span className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full bg-red-500 text-white shadow">
            <X className="size-3.5" strokeWidth={3} aria-hidden />
          </span>
        </div>
        <figcaption className="text-center text-[11px] text-muted-foreground">Con fondo</figcaption>
      </figure>
      <figure className="space-y-1">
        <div className="relative flex h-20 items-center justify-center rounded-lg bg-[#0E1A38] p-3">
          <img src="/mobile-login-logo.png" alt="" className="max-h-full w-auto object-contain" />
          <span className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow">
            <Check className="size-3.5" strokeWidth={3} aria-hidden />
          </span>
        </div>
        <figcaption className="text-center text-[11px] text-muted-foreground">Sin fondo</figcaption>
      </figure>
    </div>
  );
}

function ImagePicker({
  title,
  description,
  examples,
  footer,
  recommended,
  src,
  isCustom,
  fit,
  onPick,
  onReset,
}: {
  title: string;
  description: string;
  examples?: ReactNode;
  footer?: ReactNode;
  /** Tamaño recomendado; avisa (sin bloquear) si la imagen elegida se aleja mucho. */
  recommended: { width: number; height: number };
  src: string;
  isCustom: boolean;
  fit: "cover" | "contain";
  onPick: (file: File) => void;
  onReset: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/80 p-4">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      {examples}
      <div
        className={cn(
          "flex h-36 items-center justify-center overflow-hidden rounded-lg border border-border/60",
          fit === "contain" ? "bg-[#0E1A38] p-4" : "bg-muted",
        )}
      >
        <img
          src={src}
          alt={title}
          className={cn(
            "h-full w-full",
            fit === "cover" ? "object-cover" : "object-contain",
          )}
        />
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          if (file.size > MAX_IMAGE_BYTES) {
            setError("La imagen supera 5 MB.");
            return;
          }
          setError(null);
          setWarning(null);
          onPick(file);
          void readImageSize(file).then((size) => {
            if (!size) return;
            const vertical = recommended.height > recommended.width;
            if (vertical && size.width >= size.height) {
              setWarning(
                `La imagen es horizontal (${size.width} × ${size.height} px); en el teléfono se recortarán los lados.`,
              );
            } else if (size.width < recommended.width * 0.75) {
              setWarning(
                `La imagen mide ${size.width} × ${size.height} px; puede verse borrosa. Usa al menos ${recommended.width} × ${recommended.height} px.`,
              );
            }
          });
        }}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-primary/40 px-3 text-sm font-medium text-primary transition hover:bg-primary/5"
        >
          <Upload className="size-4" aria-hidden />
          Cambiar
        </button>
        {isCustom ? (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted"
          >
            <RotateCcw className="size-4" aria-hidden />
            Usar la del sistema
          </button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {warning ? <p className="text-xs text-amber-600">{warning}</p> : null}
      {footer}
      <p className="text-[11px] text-muted-foreground">
        Tamaño recomendado: {recommended.width} × {recommended.height} px · JPG, PNG o WebP · máx. 5 MB
      </p>
    </div>
  );
}

function LoginPreview({
  colors,
  background,
  logo,
  overlay,
}: {
  colors: BrandingColors;
  background: string;
  logo: string;
  overlay: boolean;
}) {
  const customized = (key: BrandingColorKey) =>
    (colors[key] ?? "").toUpperCase() !== DEFAULT_BRANDING_COLORS[key].toUpperCase();
  const text = (alpha: number) =>
    customized("loginText") ? colors.loginText : `rgba(255,255,255,${alpha})`;
  const fieldIcon = customized("icon") ? colors.icon : "#64748B";
  const fieldLabel = customized("secondaryText") ? colors.secondaryText : "#64748B";

  return (
    <div className="relative mx-auto aspect-[9/19] w-full max-w-[290px] overflow-hidden rounded-[2.2rem] border-[7px] border-slate-900 bg-black shadow-xl">
      <img
        src={background}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      {overlay ? (
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(110deg, rgba(26,43,94,0.88) 0%, rgba(14,26,56,0.62) 48%, rgba(0,0,0,0.28) 100%)",
          }}
        />
      ) : null}
      <div className="relative flex h-full flex-col px-4 pb-4 pt-7 text-white">
        <img src={logo} alt="Logo" className="mx-auto h-14 w-auto object-contain" />
        <p className="mt-3 text-center text-[10px] leading-snug" style={{ color: text(0.9) }}>
          <span className="font-bold" style={{ color: colors.secondary }}>
            PIEL360
          </span>{" "}
          cambia la forma de conectar con tus pacientes:{" "}
          <span className="font-bold" style={{ color: colors.secondary }}>
            evidencia visual
          </span>{" "}
          y{" "}
          <span className="font-bold" style={{ color: colors.secondary }}>
            resultados medibles
          </span>
          .
        </p>
        <div className="mt-3 rounded-xl bg-white py-2 text-center text-[10px] font-bold text-[#1A2B5E]">
          Continuar con Google
        </div>
        <div className="my-2 flex items-center gap-2 text-[8px]" style={{ color: text(0.7) }}>
          <span className="h-px flex-1 bg-white/25" />
          o continúa con tu cuenta
          <span className="h-px flex-1 bg-white/25" />
        </div>
        {[
          { icon: Mail, label: "Correo electrónico", value: "tu@correo.com" },
          { icon: Lock, label: "Contraseña", value: "••••••••" },
        ].map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="mb-1.5 flex items-center gap-2 rounded-xl bg-[#E8EDF5]/95 px-3 py-1.5"
          >
            <Icon className="size-3" style={{ color: fieldIcon }} aria-hidden />
            <div className="leading-tight">
              <p className="text-[7px]" style={{ color: fieldLabel }}>
                {label}
              </p>
              <p className="text-[9px] font-medium text-slate-800">{value}</p>
            </div>
          </div>
        ))}
        <p className="text-right text-[8px] font-bold underline" style={{ color: colors.link }}>
          ¿Olvidaste tu contraseña?
        </p>
        <div className="mt-2 flex flex-col gap-1 text-[8px]" style={{ color: text(0.82) }}>
          <p className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px] border border-current" />
            No soy un robot
          </p>
          <p className="flex items-center gap-1.5">
            <span className="size-2.5 shrink-0 rounded-[3px] border border-current" />
            <span>
              Acepto los{" "}
              <span className="font-bold underline" style={{ color: colors.link }}>
                Términos y Condiciones
              </span>
            </span>
          </p>
        </div>
        <div
          className={cn("mt-auto rounded-xl py-2.5 text-center text-[11px] font-bold", GRADIENT_HOVER_CLASS)}
          style={gradientButtonStyle(colors)}
        >
          Iniciar sesión
        </div>
        <p className="mt-2 text-center text-[9px]" style={{ color: text(0.78) }}>
          ¿No tienes una cuenta?{" "}
          <span className="font-bold underline" style={{ color: colors.link }}>
            Regístrate
          </span>
        </p>
        <p
          className="mt-1.5 text-center text-[7px] font-semibold tracking-[0.12em]"
          style={{ color: text(0.55) }}
        >
          POWERED BY{" "}
          <span className="font-extrabold" style={{ color: colors.secondary }}>
            PIEL360
          </span>
        </p>
      </div>
    </div>
  );
}

function AppPreview({ colors }: { colors: BrandingColors }) {
  return (
    <div
      className="relative mx-auto flex aspect-[9/19] w-full max-w-[290px] flex-col overflow-hidden rounded-[2.2rem] border-[7px] border-slate-900 shadow-xl"
      style={{ backgroundColor: colors.background }}
    >
      <div
        className="px-4 pb-4 pt-6"
        style={{ backgroundColor: colors.primary, color: readableOn(colors.primary) }}
      >
        <p className="text-[9px] opacity-80">Hola,</p>
        <p className="text-sm font-bold">Dra. Ana Gómez</p>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-3">
        <p className="text-xs font-bold" style={{ color: colors.primaryText }}>
          Pacientes recientes
        </p>
        {["Laura Pérez", "Carlos Ruiz"].map((name) => (
          <div key={name} className="flex items-center gap-2 rounded-xl bg-white p-2.5 shadow-sm">
            <UserRound className="size-4 shrink-0" style={{ color: colors.icon }} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold text-slate-800">{name}</p>
              <p className="text-[8px]" style={{ color: colors.secondaryText }}>
                Último análisis hace 3 días
              </p>
            </div>
            <ChevronRight className="size-3.5 shrink-0" style={{ color: colors.icon }} aria-hidden />
          </div>
        ))}
        <p className="mt-1 text-xs font-bold" style={{ color: colors.primaryText }}>
          Resumen
        </p>
        <div className="rounded-xl bg-white p-2.5 shadow-sm">
          <div className="h-1.5 w-2/3 rounded-full" style={{ backgroundColor: colors.primary }} />
          <div className="mt-1.5 h-1.5 w-1/3 rounded-full bg-slate-200" />
        </div>
        <div
          className={cn("mt-auto rounded-xl py-2.5 text-center text-[11px] font-bold", BUTTON_HOVER_CLASS)}
          style={buttonStyle(colors)}
        >
          Nuevo análisis
        </div>
        <div
          className={cn("rounded-xl py-2.5 text-center text-[11px] font-bold", GRADIENT_HOVER_CLASS)}
          style={gradientButtonStyle(colors)}
        >
          Botón con degradado
        </div>
      </div>
    </div>
  );
}

export function IdentidadCorporativaView() {
  const branding = useMyBranding();
  const updateBranding = useUpdateBranding();
  const uploadImage = useUploadBrandingImage();
  const removeImage = useRemoveBrandingImage();

  const saved = branding.data;
  const [colors, setColors] = useState<BrandingColors>(DEFAULT_BRANDING_COLORS);
  const [activeField, setActiveField] = useState<BrandingColorKey>("primary");
  const [background, setBackground] = useState<PendingImage>(null);
  const [logo, setLogo] = useState<PendingImage>(null);
  const [overlay, setOverlay] = useState(true);
  const [previewMode, setPreviewMode] = useState<"login" | "app">("login");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const savedColors = useMemo<BrandingColors | undefined>(
    () =>
      saved ? { ...DEFAULT_BRANDING_COLORS, ...saved.colors } : undefined,
    [saved],
  );
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza el formulario con lo guardado
    if (savedColors) setColors(savedColors);
  }, [savedColors]);
  const savedOverlay = saved?.loginOverlay ?? true;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza el formulario con lo guardado
    setOverlay(savedOverlay);
  }, [savedOverlay]);

  useEffect(() => () => revokePreview(background), [background]);
  useEffect(() => () => revokePreview(logo), [logo]);

  const resolveImage = (
    pending: PendingImage,
    savedUrl: string | null | undefined,
    fallback: string,
  ) => {
    if (pending === "reset") return { src: fallback, custom: false };
    if (pending) return { src: pending.previewUrl, custom: true };
    return { src: savedUrl ?? fallback, custom: Boolean(savedUrl) };
  };
  const backgroundImage = resolveImage(
    background,
    saved?.loginBackgroundUrl,
    DEFAULT_LOGIN_BACKGROUND,
  );
  const logoImage = resolveImage(logo, saved?.loginLogoUrl, DEFAULT_LOGIN_LOGO);

  const dirty = useMemo(
    () =>
      Boolean(background) ||
      Boolean(logo) ||
      overlay !== savedOverlay ||
      (savedColors ? !sameColors(colors, savedColors) : false),
    [background, logo, overlay, savedOverlay, colors, savedColors],
  );

  const setColor = (key: BrandingColorKey, hex: string) => {
    setMessage(null);
    setColors((current) => ({ ...current, [key]: hex }));
  };

  const pickImage = (kind: BrandingImageKind, file: File) => {
    setMessage(null);
    const next = { file, previewUrl: URL.createObjectURL(file) };
    if (kind === "login-background") setBackground(next);
    else setLogo(next);
  };

  const resetImage = (kind: BrandingImageKind) => {
    setMessage(null);
    const savedUrl =
      kind === "login-background" ? saved?.loginBackgroundUrl : saved?.loginLogoUrl;
    const next: PendingImage = savedUrl ? "reset" : null;
    if (kind === "login-background") setBackground(next);
    else setLogo(next);
  };

  const discard = () => {
    setMessage(null);
    if (savedColors) setColors(savedColors);
    setOverlay(savedOverlay);
    setBackground(null);
    setLogo(null);
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const colorsChanged = savedColors && !sameColors(colors, savedColors);
      if (colorsChanged || overlay !== savedOverlay) {
        await updateBranding.mutateAsync({
          ...(colorsChanged ? { colors } : {}),
          loginOverlay: overlay,
        });
      }
      for (const [kind, pending] of [
        ["login-background", background],
        ["login-logo", logo],
      ] as const) {
        if (pending === "reset") await removeImage.mutateAsync(kind);
        else if (pending) await uploadImage.mutateAsync({ kind, file: pending.file });
      }
      setBackground(null);
      setLogo(null);
      setMessage({
        ok: true,
        text: "Cambios guardados. Tu app móvil y la de tus pacientes los verán al abrirla.",
      });
    } catch (err) {
      setMessage({
        ok: false,
        text: err instanceof Error ? err.message : "No se pudieron guardar los cambios.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (branding.isLoading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Cargando personalización…
      </div>
    );
  }

  if (branding.isError) {
    return (
      <p className="py-10 text-sm text-destructive">
        No se pudo cargar la personalización.{" "}
        {branding.error instanceof Error
          ? branding.error.message
          : "Intenta de nuevo más tarde."}
      </p>
    );
  }

  const activeLabel =
    COLOR_FIELDS.find((field) => field.key === activeField)?.label ?? "";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/doctor/configuracion/personalizacion"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Personalización
          </Link>
          <h2 className="mt-1 text-xl font-semibold text-foreground">
            Identidad corporativa
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Define los colores, el fondo y el logo del login de tu app móvil. Los
            cambios se aplican a tu cuenta, a tu equipo y a tus pacientes al
            guardar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty ? (
            <button
              type="button"
              onClick={discard}
              disabled={saving}
              className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-muted-foreground transition hover:bg-muted disabled:opacity-60"
            >
              Descartar
            </button>
          ) : null}
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Guardar cambios
          </button>
        </div>
      </div>

      {message ? (
        <p
          className={cn(
            "rounded-lg px-4 py-2.5 text-sm",
            message.ok
              ? "bg-emerald-50 text-emerald-700"
              : "bg-destructive/10 text-destructive",
          )}
        >
          {message.text}
        </p>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <h3 className="text-base font-semibold text-foreground">
              Colores del tema
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Elige entre los colores disponibles o aplica uno de las paletas
              recomendadas al campo seleccionado.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {COLOR_FIELDS.map((field) => {
                const value = colors[field.key] ?? "";
                const isActive = field.key === activeField;
                return (
                  <div
                    key={field.key}
                    onClick={() => setActiveField(field.key)}
                    className={cn(
                      "cursor-pointer rounded-xl border p-3.5 transition-colors",
                      isActive
                        ? "border-primary/50 bg-primary/5"
                        : "border-border/80 hover:bg-muted/30",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {field.label}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {field.description}
                        </p>
                      </div>
                      {value.toUpperCase() !==
                      (DEFAULT_BRANDING_COLORS[field.key] ?? "").toUpperCase() ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setColor(field.key, DEFAULT_BRANDING_COLORS[field.key]);
                          }}
                          title="Restablecer color por defecto"
                          className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        >
                          <RotateCcw className="size-3.5" aria-hidden />
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-border/80 bg-background px-2.5 py-1.5">
                      <span
                        className="size-5 rounded-md border border-black/10"
                        style={{ backgroundColor: value }}
                      />
                      <span className="font-mono text-xs text-foreground/80">
                        {value.toUpperCase()}
                      </span>
                    </div>
                    <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Colores base
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {(field.baseOptions ?? BRANDING_BASE_COLORS).map((option) => (
                        <Swatch
                          key={option.hex}
                          hex={option.hex}
                          label={option.label}
                          selected={value.toUpperCase() === option.hex.toUpperCase()}
                          onClick={() => {
                            setActiveField(field.key);
                            setColor(field.key, option.hex);
                          }}
                        />
                      ))}
                    </div>
                    <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Paletas recomendadas
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2">
                      {BRANDING_PALETTES.map((palette) => (
                        <div
                          key={palette.id}
                          title={palette.name}
                          className="flex items-center gap-1.5 rounded-full border border-border/70 px-1.5 py-1"
                        >
                          {palette.colors.map((option) => (
                            <Swatch
                              key={option.hex}
                              size="sm"
                              hex={option.hex}
                              label={`${palette.name} · ${option.label}`}
                              selected={
                                value.toUpperCase() === option.hex.toUpperCase()
                              }
                              onClick={() => {
                                setActiveField(field.key);
                                setColor(field.key, option.hex);
                              }}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <h3 className="text-base font-semibold text-foreground">
              Paletas recomendadas
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Toca un color para aplicarlo a{" "}
              <span className="font-medium text-foreground">{activeLabel}</span>.
            </p>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {BRANDING_PALETTES.map((palette) => (
                <div
                  key={palette.id}
                  className="rounded-xl border border-border/80 p-3.5"
                >
                  <p className="text-sm font-semibold text-foreground">
                    {palette.name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {palette.description}
                  </p>
                  <div className="mt-3 space-y-2">
                    {palette.colors.map((option) => (
                      <div key={option.hex} className="flex items-center gap-2.5">
                        <Swatch
                          size="sm"
                          hex={option.hex}
                          label={option.label}
                          selected={
                            (colors[activeField] ?? "").toUpperCase() ===
                            option.hex.toUpperCase()
                          }
                          onClick={() => setColor(activeField, option.hex)}
                        />
                        <div className="min-w-0 leading-tight">
                          <p className="truncate text-xs font-medium text-foreground">
                            {option.label}
                          </p>
                          <p className="font-mono text-[11px] text-muted-foreground">
                            {option.hex}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <ImageIcon className="size-4 text-primary" aria-hidden />
              Imágenes del login
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Solo cambian el fondo y el logo de la pantalla de inicio de sesión;
              los demás logos de la app se mantienen.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <ImagePicker
                title="Foto de fondo del login"
                description="Vertical. Deja lo importante en el centro: según el teléfono se pueden recortar un poco los bordes, y a la izquierda se oscurece para que el texto se lea."
                recommended={{ width: 1080, height: 2340 }}
                src={backgroundImage.src}
                isCustom={backgroundImage.custom}
                fit="cover"
                onPick={(file) => pickImage("login-background", file)}
                onReset={() => resetImage("login-background")}
                footer={
                  <label className="flex cursor-pointer items-start gap-2 text-xs text-foreground/80">
                    <input
                      type="checkbox"
                      checked={!overlay}
                      onChange={(e) => {
                        setMessage(null);
                        setOverlay(!e.target.checked);
                      }}
                      className="mt-0.5 size-4 accent-primary"
                    />
                    <span>
                      Quitar el degradado oscuro sobre la foto. Úsalo si tu imagen ya
                      deja leer bien los textos del login.
                    </span>
                  </label>
                }
              />
              <ImagePicker
                title="Logo del login"
                description="Sube el logo sin fondo (PNG transparente), horizontal o cuadrado. Si trae fondo blanco o de color, se verá como un recuadro sobre el login. También se muestra en el registro y junto al nombre en el inicio."
                examples={<LogoExamples />}
                recommended={{ width: 600, height: 300 }}
                src={logoImage.src}
                isCustom={logoImage.custom}
                fit="contain"
                onPick={(file) => pickImage("login-logo", file)}
                onReset={() => resetImage("login-logo")}
              />
            </div>
          </section>
        </div>

        <aside className="xl:sticky xl:top-4 xl:self-start">
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Smartphone className="size-4 text-primary" aria-hidden />
                Vista previa
              </p>
              <div className="flex rounded-lg bg-muted p-0.5 text-xs font-medium">
                {(
                  [
                    ["login", "Login"],
                    ["app", "App"],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPreviewMode(mode)}
                    className={cn(
                      "rounded-md px-3 py-1 transition",
                      previewMode === mode
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {previewMode === "login" ? (
              <LoginPreview
                colors={colors}
                background={backgroundImage.src}
                logo={logoImage.src}
                overlay={overlay}
              />
            ) : (
              <AppPreview colors={colors} />
            )}
            {dirty ? (
              <p className="mt-3 text-center text-xs text-amber-600">
                Tienes cambios sin guardar.
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
