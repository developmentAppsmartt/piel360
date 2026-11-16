import Image from "next/image";
import type { LandingContent, PendingLink } from "../content/types";
import { PendingBadge, sectionWrap } from "../landing-ui";

function FooterLink({ link, pendingLabel }: { link: PendingLink; pendingLabel: string }) {
  if (link.pending) {
    return (
      <span className="text-slate-400">
        {link.label}
        <PendingBadge>{pendingLabel}</PendingBadge>
      </span>
    );
  }
  const external = link.href.startsWith("http");
  return (
    <a
      href={link.href}
      className="text-slate-300 transition-colors hover:text-white"
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {link.label}
    </a>
  );
}

export function LandingFooter({ content }: { content: LandingContent["footer"] }) {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-[#05101f] py-14 text-sm text-slate-300">
      <div className={`${sectionWrap} grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]`}>
        <div>
          <div className="inline-flex rounded-2xl bg-white px-4 py-3">
            <Image src="/logo-piel360.png" alt="PIEL 360" width={575} height={210} className="h-9 w-auto" />
          </div>
          <p className="mt-4 max-w-xs text-slate-400">{content.tagline}</p>
        </div>
        <div>
          <h2 className="font-semibold text-white">{content.contactTitle}</h2>
          <ul className="mt-3 space-y-2">
            {content.contact.map((link) => (
              <li key={link.label}>
                <FooterLink link={link} pendingLabel={content.pending} />
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-semibold text-white">{content.socialTitle}</h2>
          <ul className="mt-3 space-y-2">
            {content.social.map((link) => (
              <li key={link.label}>
                <FooterLink link={link} pendingLabel={content.pending} />
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className={`${sectionWrap} mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between`}>
        <p className="text-slate-500">{content.rights(year)}</p>
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          {content.legal.map((link) => (
            <li key={link.label}>
              <FooterLink link={link} pendingLabel={content.pending} />
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
