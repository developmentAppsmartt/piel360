"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, X } from "lucide-react";
import type { LeadIntent, LeadInterest } from "@piel360/shared";
import { PhoneField } from "@/components/ui/phone-field";
import { cn } from "@/lib/utils";
import type { LandingContent } from "../content/types";
import { LEAD_FORM_ID, LEAD_PRESET_EVENT, type LeadPreset } from "../lead-cta";
import { SectionHeading, btnPrimary, btnSecondary, sectionWrap } from "../landing-ui";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";
const INTERESTS: LeadInterest[] = ["aesthetic", "derm", "both"];

type Status = "idle" | "sending" | "sent" | "error";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const inputClass =
  "mt-1.5 block min-h-12 w-full rounded-xl border border-(--landing-line) bg-white px-4 text-base text-(--landing-ink) placeholder:text-slate-400 focus:border-(--landing-electric) focus:outline-none focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-(--landing-electric)";

function utmParams() {
  const params = new URLSearchParams(window.location.search);
  const read = (key: string) => params.get(key)?.slice(0, 120) || undefined;
  return { utmSource: read("utm_source"), utmMedium: read("utm_medium"), utmCampaign: read("utm_campaign") };
}

export function LeadForm({
  content,
  plans,
}: {
  content: LandingContent["form"];
  plans: { id: string; name: string }[];
}) {
  const [interest, setInterest] = useState<LeadInterest>("both");
  const [plan, setPlan] = useState<{ id: string; name: string } | null>(null);
  const [customPlan, setCustomPlan] = useState(false);
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    const onPreset = (event: Event) => {
      const preset = (event as CustomEvent<LeadPreset>).detail;
      if (preset.interest) setInterest(preset.interest);
      setPlan(plans.find((p) => p.id === preset.planId) ?? null);
      setCustomPlan(preset.intent === "custom_plan");
      setStatus("idle");
    };
    window.addEventListener(LEAD_PRESET_EVENT, onPreset);
    return () => window.removeEventListener(LEAD_PRESET_EVENT, onPreset);
  }, [plans]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const intent: LeadIntent = customPlan ? "custom_plan" : submitter?.value === "meeting" ? "meeting" : "demo";
    const data = new FormData(form);
    const text = (key: string) => String(data.get(key) ?? "").trim();

    setStatus("sending");
    try {
      const res = await fetch(`${API_URL}/public/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: text("name"),
          business: text("business"),
          email: text("email"),
          phone: text("phone"),
          interest,
          intent,
          planId: plan?.id,
          website: text("website") || undefined,
          ...utmParams(),
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("sent");
      form.reset();
      setPhone("");
      window.gtag?.("event", "generate_lead", { lead_interest: interest, lead_intent: intent });
    } catch {
      setStatus("error");
    }
  }

  return (
    <section id={LEAD_FORM_ID} className="scroll-mt-16 py-16 sm:py-24">
      <div className={`${sectionWrap} grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center`}>
        <SectionHeading align="left" kicker={content.kicker} title={content.title} text={content.text} />

        <form
          onSubmit={onSubmit}
          className="landing-holo-border rounded-[2rem] bg-white p-6 shadow-[0_40px_100px_-50px_rgba(29,107,255,0.6)] sm:p-8"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-(--landing-navy)">
              {content.fields.name}
              <input name="name" required minLength={2} maxLength={120} autoComplete="name" className={inputClass} />
            </label>
            <label className="text-sm font-semibold text-(--landing-navy)">
              {content.fields.business}
              <input name="business" required minLength={2} maxLength={160} autoComplete="organization" className={inputClass} />
            </label>
            <label className="text-sm font-semibold text-(--landing-navy)">
              {content.fields.email}
              <input name="email" type="email" required maxLength={160} autoComplete="email" className={inputClass} />
            </label>
            <label className="text-sm font-semibold text-(--landing-navy)">
              {content.fields.phone}
              <input type="hidden" name="phone" value={phone} />
              <PhoneField value={phone} onChange={setPhone} required className="mt-1.5 h-11 bg-white" />
            </label>
          </div>

          {/* Trampa para bots: oculta para las personas y los lectores. */}
          <div className="absolute left-[-9999px]" aria-hidden>
            <label>
              Sitio web
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>

          <fieldset className="mt-5">
            <legend className="text-sm font-semibold text-(--landing-navy)">{content.fields.interest}</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {INTERESTS.map((value) => (
                <label
                  key={value}
                  className={cn(
                    "flex min-h-12 cursor-pointer items-center justify-center rounded-xl border px-2 text-center text-sm font-semibold transition-colors has-focus-visible:outline-[3px] has-focus-visible:outline-offset-2 has-focus-visible:outline-(--landing-electric)",
                    interest === value
                      ? "border-(--landing-electric) bg-[#eaf1ff] text-(--landing-electric)"
                      : "border-(--landing-line) text-(--landing-muted) hover:border-(--landing-medical)",
                  )}
                >
                  <input
                    type="radio"
                    name="interest"
                    value={value}
                    checked={interest === value}
                    onChange={() => setInterest(value)}
                    className="sr-only"
                  />
                  {content.interests[value]}
                </label>
              ))}
            </div>
          </fieldset>

          {plan || customPlan ? (
            <p className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-(--landing-mist) px-4 py-2.5 text-sm text-(--landing-navy)">
              <span>{plan ? `Plan: ${plan.name}` : "Plan a la medida"}</span>
              <button
                type="button"
                onClick={() => {
                  setPlan(null);
                  setCustomPlan(false);
                }}
                className="inline-flex size-8 items-center justify-center rounded-full hover:bg-white"
                aria-label="Quitar el plan elegido"
              >
                <X className="size-4" />
              </button>
            </p>
          ) : null}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button type="submit" value="demo" disabled={status === "sending"} className={cn(btnPrimary, "disabled:opacity-60")}>
              {status === "sending" ? content.sending : content.ctaDemo}
            </button>
            <button type="submit" value="meeting" disabled={status === "sending"} className={cn(btnSecondary, "disabled:opacity-60")}>
              {content.ctaMeeting}
            </button>
          </div>

          <div aria-live="polite" className="mt-4 min-h-6 text-sm">
            {status === "sent" ? (
              <p className="flex items-start gap-2 font-semibold text-emerald-700">
                <CheckCircle2 className="size-5 shrink-0" aria-hidden />
                {content.success}
              </p>
            ) : status === "error" ? (
              <p role="alert" className="font-semibold text-red-700">
                {content.error}
              </p>
            ) : (
              <p className="text-(--landing-muted)">{content.privacy}</p>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
