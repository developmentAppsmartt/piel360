import type { LandingContent } from "./content/types";

/** Schema.org de la landing: la organización, el producto y las preguntas
 * frecuentes (las mismas que se ven en la página). */
export function LandingJsonLd({ content, siteUrl }: { content: LandingContent; siteUrl: string }) {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: content.meta.siteName,
        url: siteUrl,
        logo: `${siteUrl}/logo-piel360.png`,
        slogan: content.footer.tagline,
      },
      {
        "@type": "SoftwareApplication",
        name: content.meta.siteName,
        applicationCategory: "HealthApplication",
        operatingSystem: "Web, Android",
        description: content.meta.description,
        publisher: { "@id": `${siteUrl}/#organization` },
      },
      {
        "@type": "FAQPage",
        mainEntity: content.faq.items.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // El contenido es nuestro (content/es.ts); se escapa `<` para que ningún
      // texto pueda cerrar la etiqueta.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
