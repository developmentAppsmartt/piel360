import { LEGAL_UPDATED_LABEL, type LegalDocument } from "@piel360/shared";

/** Un documento legal (términos o política de datos) para leer. */
export function LegalDocumentView({ doc, compact = false }: { doc: LegalDocument; compact?: boolean }) {
  return (
    <article className={compact ? "space-y-3 text-sm" : "space-y-5"}>
      <header className="space-y-1">
        <h1 className={compact ? "text-base font-bold text-foreground" : "text-2xl font-bold text-foreground sm:text-3xl"}>
          {doc.title}
        </h1>
        <p className="text-xs text-muted-foreground">Última actualización: {LEGAL_UPDATED_LABEL}</p>
      </header>
      <p className="leading-relaxed text-foreground">{doc.intro}</p>
      {doc.sections.map((section) => (
        <section key={section.title} className="space-y-1.5">
          <h2 className={compact ? "text-sm font-semibold text-foreground" : "text-lg font-semibold text-foreground"}>
            {section.title}
          </h2>
          {section.paragraphs.map((p) => (
            <p key={p} className="leading-relaxed text-muted-foreground">
              {p}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}
