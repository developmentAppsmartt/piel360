/** Todo el texto de la landing pasa por aquí: para el inglés basta con un
 * `en.ts` del mismo tipo, sin tocar las secciones. */

export type LandingLink = { label: string; href: string };

/** Un dato que el cliente todavía no ha entregado se marca `pending`: la
 * landing lo pinta con la etiqueta «Próximamente» en vez de inventarlo. */
export type PendingLink = LandingLink & { pending?: boolean };

export type LandingCard = { title: string; text: string };

export type LandingContent = {
  meta: { title: string; description: string; siteName: string };
  nav: { links: LandingLink[]; login: string; cta: string };
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    tagline: string;
    ctaDemo: string;
    ctaVideo: string;
    ctaPlans: string;
    stats: { value: string; label: string }[];
    videoPending: string;
  };
  dual: {
    aesthetic: { kicker: string; title: string; text: string; cta: string };
    derm: { kicker: string; title: string; text: string; cta: string };
  };
  whatIs: { kicker: string; title: string; text: string; pillars: LandingCard[] };
  aesthetic: {
    kicker: string;
    title: string;
    text: string;
    parameters: string[];
    note: string;
  };
  derm: {
    kicker: string;
    title: string;
    text: string;
    capabilities: string[];
    disclaimer: string;
  };
  steps: { kicker: string; title: string; items: LandingCard[] };
  benefits: { kicker: string; title: string; items: LandingCard[] };
  useCases: { kicker: string; title: string; items: string[] };
  pricing: {
    kicker: string;
    title: string;
    text: string;
    tabs: { aesthetic: string; derm: string };
    perPeriod: (days: number) => string;
    analyses: (n: number) => string;
    users: (n: number) => string;
    popular: string;
    ctaBuy: string;
    ctaDemo: string;
    custom: { title: string; text: string; cta: string };
    empty: string;
    compareTitle: string;
    taxNote: string;
  };
  testimonials: {
    kicker: string;
    title: string;
    sampleBadge: string;
    items: { quote: string; name: string; role: string; result: string }[];
  };
  faq: { kicker: string; title: string; items: { q: string; a: string }[] };
  form: {
    kicker: string;
    title: string;
    text: string;
    fields: {
      name: string;
      business: string;
      email: string;
      phone: string;
      interest: string;
    };
    interests: { aesthetic: string; derm: string; both: string };
    ctaDemo: string;
    ctaMeeting: string;
    sending: string;
    success: string;
    error: string;
    privacy: string;
  };
  footer: {
    tagline: string;
    contactTitle: string;
    contact: PendingLink[];
    socialTitle: string;
    social: PendingLink[];
    legal: PendingLink[];
    pending: string;
    rights: (year: number) => string;
  };
};
