"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LandingContent } from "../content/types";
import { LeadCta } from "../lead-cta";
import { btnPrimary } from "../landing-ui";

export function LandingHeader({ content }: { content: LandingContent["nav"] }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow] duration-300",
        scrolled || open
          ? "bg-white/85 shadow-[0_1px_0_rgba(15,23,42,0.08)] backdrop-blur-lg"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="PIEL 360, inicio" className="shrink-0">
          <Image
            src="/logo-piel360.png"
            alt="PIEL 360"
            width={575}
            height={210}
            priority
            className="h-9 w-auto"
          />
        </Link>

        <nav aria-label="Secciones" className="hidden items-center gap-7 md:flex">
          {content.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-(--landing-muted) transition-colors hover:text-(--landing-navy)"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/ingresar"
            className="inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold text-(--landing-medical) hover:bg-(--landing-mist)"
          >
            {content.login}
          </Link>
          <LeadCta className={cn(btnPrimary, "hidden min-h-10 px-5 sm:inline-flex")}>{content.cta}</LeadCta>
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-full text-(--landing-navy) hover:bg-(--landing-mist) md:hidden"
            aria-expanded={open}
            aria-controls="landing-mobile-nav"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <nav id="landing-mobile-nav" aria-label="Secciones" className="border-t border-(--landing-line) px-4 pb-4 md:hidden">
          {content.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-2 py-3 text-base font-medium text-(--landing-navy) hover:bg-(--landing-mist)"
            >
              {link.label}
            </a>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
