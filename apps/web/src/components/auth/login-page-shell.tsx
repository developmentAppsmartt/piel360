import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

const HERO_IMAGE = {
  src: "/landin-home.png",
  width: 1157,
  height: 1606,
} as const;

export function LoginPageShell({
  title,
  description,
  icon: Icon,
  children,
  footer,
  accountPrompt,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
  footer?: ReactNode;
  accountPrompt?: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center bg-[#f4f7fb] px-4 py-6 sm:py-10">
      <div className="relative w-full max-w-[420px] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
        <div className="pointer-events-none absolute top-0 right-0 z-0 h-1/2 w-[64%]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HERO_IMAGE.src}
            alt=""
            width={HERO_IMAGE.width}
            height={HERO_IMAGE.height}
            className="h-full w-full object-cover object-[92%_18%]"
          />
        </div>
        <div className="pointer-events-none absolute top-0 right-0 z-0 h-1/2 w-full bg-gradient-to-r from-white from-42% via-white/88 via-68% to-transparent" />

        <div className="relative z-10 px-5 pt-5 pb-5 sm:px-6 sm:pt-6">
          <Image
            src="/logo-piel360.png"
            alt="PIEL 360"
            width={575}
            height={210}
            priority
            className="object-contain object-left"
            style={{ width: "min(100%, 190px)", height: "auto" }}
          />
         
        </div>

        <div className="relative z-10 px-5 pb-6 sm:px-6 sm:pb-7">
          <div className="flex flex-col items-center text-center">
            <div className="rounded-full bg-gradient-to-br from-[#6b4fd4] to-[#3b82c4] p-[2px]">
              <div className="flex size-[68px] items-center justify-center rounded-full bg-white text-primary">
                <Icon className="size-8" strokeWidth={1.5} aria-hidden />
              </div>
            </div>
            <h1 className="mt-4 text-[1.65rem] font-bold tracking-tight text-[#0f3d73]">{title}</h1>
            <p className="mt-2 max-w-[320px] text-sm leading-relaxed text-slate-500">{description}</p>
          </div>

          <div className="mt-6">{children}</div>

          {accountPrompt ? (
            <p className="mt-5 text-center text-sm leading-relaxed text-slate-500">
              {accountPrompt}
            </p>
          ) : null}
          {footer ? (
            <div className="mt-4 text-center text-sm text-slate-500">{footer}</div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
