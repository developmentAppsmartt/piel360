/**
 * Identidad corporativa que un profesional o empresa configura en
 * Configuración → Personalización. Se aplica en la app móvil del propio
 * profesional, de su equipo y de sus pacientes.
 *
 * Mobile no importa este paquete: `apps/mobile/src/config/branding.defaults.ts`
 * repite los mismos valores por defecto.
 */

export type BrandingColorOption = { hex: string; label: string };

/** Colores base seleccionables. El primero es el azul del sistema (por defecto). */
export const BRANDING_BASE_COLORS: readonly BrandingColorOption[] = [
  { hex: "#1E5A9E", label: "Azul Piel 360" },
  { hex: "#1A2B5E", label: "Azul marino" },
  { hex: "#8544DA", label: "Violeta" },
  { hex: "#2DD4BF", label: "Verde menta" },
] as const;

/** Colores base del texto primario: los de la marca, el gris del sistema y el negro. */
export const BRANDING_TEXT_COLORS: readonly BrandingColorOption[] = [
  ...BRANDING_BASE_COLORS,
  { hex: "#6B7280", label: "Gris" },
  { hex: "#000000", label: "Negro" },
] as const;

/** Colores base del fondo de las vistas: el gris claro del sistema (por defecto) y tonos suaves. */
export const BRANDING_BACKGROUND_COLORS: readonly BrandingColorOption[] = [
  { hex: "#F5F6FA", label: "Gris claro" },
  { hex: "#FFFFFF", label: "Blanco" },
  { hex: "#E8F4FC", label: "Azul hielo" },
  { hex: "#F5F3FF", label: "Lavanda" },
] as const;

/** Colores base del texto secundario: gris oscuro del sistema (por defecto), la marca y el negro. */
export const BRANDING_SECONDARY_TEXT_COLORS: readonly BrandingColorOption[] = [
  { hex: "#1A1A1A", label: "Gris oscuro" },
  ...BRANDING_TEXT_COLORS,
] as const;

/** Colores base del texto de los botones: blanco (por defecto), la marca y el negro. */
export const BRANDING_BUTTON_TEXT_COLORS: readonly BrandingColorOption[] = [
  { hex: "#FFFFFF", label: "Blanco" },
  ...BRANDING_TEXT_COLORS,
] as const;

export type BrandingPalette = {
  id: string;
  name: string;
  description: string;
  colors: readonly BrandingColorOption[];
};

export const BRANDING_PALETTES: readonly BrandingPalette[] = [
  {
    id: "clinical",
    name: "Clínica & Dermatológica",
    description:
      "Rigor y limpieza: transmite confianza médica e higiene impecable.",
    colors: [
      { hex: "#FFFFFF", label: "Blanco clínico" },
      { hex: "#E5E5E5", label: "Gris claro / Greige" },
      { hex: "#A8C3D8", label: "Azul niebla" },
    ],
  },
  {
    id: "holistic",
    name: "Holística & Estética Natural",
    description:
      "Bienestar y salud: ideal para centros de estética y spas que priorizan lo orgánico.",
    colors: [
      { hex: "#FDFBF7", label: "Blanco roto / Marfil" },
      { hex: "#B2C7B2", label: "Verde salvia" },
      { hex: "#E6D7C3", label: "Beige arena" },
    ],
  },
  {
    id: "minimal",
    name: "Minimalista Elegante",
    description:
      "Lujo y delicadeza: para medicina estética de alta gama y cuidado premium.",
    colors: [
      { hex: "#E8C5C8", label: "Palo de rosa" },
      { hex: "#D9D2C9", label: "Gris lino" },
      { hex: "#D4AF37", label: "Dorado metálico" },
    ],
  },
] as const;

export type BrandingColors = {
  /** Fondo de las vistas de la app. */
  background: string;
  /** Fondo del menú inferior de módulos (Inicio, Pacientes, Agenda…). */
  menuBackground: string;
  /** Header, fondos y acentos que hoy usan el azul del sistema en mobile. */
  primary: string;
  /** Títulos y valores destacados. */
  primaryText: string;
  /** Texto general (párrafos, descripciones, datos). */
  secondaryText: string;
  /** Iconos del sistema. */
  icon: string;
  /** Textos resaltados en negrita del login. */
  secondary: string;
  /** Enlaces (textos subrayados). */
  link: string;
  /** Letra del login y del registro que no es título. */
  loginText: string;
  /** Fondo de los botones. */
  button: string;
  /** Fondo de los botones al presionar (hover en web). */
  buttonHover: string;
  /** Botones con degradado (p. ej. "Iniciar sesión"). */
  gradientStart: string;
  gradientEnd: string;
  /** Degradado de los botones al presionar (hover en web). */
  gradientHoverStart: string;
  gradientHoverEnd: string;
  /** Texto de los botones generales. */
  buttonText: string;
  /** Texto de los botones con degradado. */
  gradientText: string;
};

export type BrandingColorKey = keyof BrandingColors;

export const DEFAULT_BRANDING_COLORS: BrandingColors = {
  background: "#F5F6FA",
  menuBackground: "#FFFFFF",
  primary: "#1E5A9E",
  primaryText: "#1E5A9E",
  secondaryText: "#1A1A1A",
  icon: "#1E5A9E",
  secondary: "#2DD4BF",
  link: "#2DD4BF",
  loginText: "#FFFFFF",
  button: "#1E5A9E",
  buttonHover: "#1A2B5E",
  gradientStart: "#1E5A9E",
  gradientEnd: "#2DD4BF",
  gradientHoverStart: "#1A2B5E",
  gradientHoverEnd: "#2DD4BF",
  buttonText: "#FFFFFF",
  gradientText: "#FFFFFF",
};

export const BRANDING_COLOR_KEYS = Object.keys(
  DEFAULT_BRANDING_COLORS,
) as BrandingColorKey[];

const ALLOWED = new Set(
  [
    ...BRANDING_BASE_COLORS,
    ...BRANDING_PALETTES.flatMap((palette) => palette.colors),
  ].map((color) => color.hex.toUpperCase()),
);

const TEXT_KEYS: readonly BrandingColorKey[] = [
  "primaryText",
  "secondaryText",
  "buttonText",
  "gradientText",
  "link",
  "loginText",
];

const ALLOWED_BACKGROUND = new Set(
  BRANDING_BACKGROUND_COLORS.map((color) => color.hex.toUpperCase()),
);

const ALLOWED_TEXT = new Set(
  [...BRANDING_BUTTON_TEXT_COLORS, ...BRANDING_SECONDARY_TEXT_COLORS].map(
    (color) => color.hex.toUpperCase(),
  ),
);

export function isAllowedBrandingColor(
  hex: string,
  key?: BrandingColorKey,
): boolean {
  const value = hex.trim().toUpperCase();
  if (
    (key === "background" || key === "menuBackground") &&
    ALLOWED_BACKGROUND.has(value)
  ) {
    return true;
  }
  return (
    ALLOWED.has(value) ||
    (key !== undefined && TEXT_KEYS.includes(key) && ALLOWED_TEXT.has(value))
  );
}

/** Respuesta de la API: colores ya resueltos con los valores por defecto. */
export type AccountBranding = {
  /** Identificador público para pedir el branding sin sesión (login móvil). */
  publicId: string | null;
  colors: BrandingColors;
  /** `null` = imagen por defecto del sistema. */
  loginBackgroundUrl: string | null;
  loginLogoUrl: string | null;
  /** Degradado oscuro del login sobre la imagen de fondo. */
  loginOverlay: boolean;
};

export const DEFAULT_ACCOUNT_BRANDING: AccountBranding = {
  publicId: null,
  colors: DEFAULT_BRANDING_COLORS,
  loginBackgroundUrl: null,
  loginLogoUrl: null,
  loginOverlay: true,
};
