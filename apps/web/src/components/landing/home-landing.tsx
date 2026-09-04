import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Star, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCESS_ROLES = [
  {
    id: "usuario",
    title: "Soy Usuario",
    description:
      "Accede a la plataforma para realizar análisis y gestionar pacientes.",
    href: "/doctor/login",
    icon: UserRound,
  },
  {
    id: "admin",
    title: "Soy Administrador",
    description:
      "Gestiona usuarios, planes, configuraciones y permisos de la plataforma.",
    href: "/admin/login",
    icon: ShieldCheck,
  },
  {
    id: "moderador",
    title: "Soy Moderador",
    description:
      "Revisa, modera y supervisa contenido y análisis dentro de la plataforma.",
    href: "/moderador/login",
    icon: Star,
  },
] as const;

const HERO_IMAGE = {
  src: "/landin-home.png",
  width: 1157,
  height: 1606,
} as const;

function AccessCard({
  title,
  description,
  href,
  icon: Icon,
}: (typeof ACCESS_ROLES)[number]) {
  return (
    <article className="mx-auto flex h-full w-full max-w-[300px] flex-col items-center rounded-2xl border border-slate-100 bg-white px-6 py-7 text-center shadow-[0_10px_40px_rgba(15,23,42,0.08)]">
      <div className="mb-5 flex size-[72px] items-center justify-center rounded-full border-2 border-[#1e5a9e] text-[#1e5a9e]">
        <Icon className="size-8" strokeWidth={1.5} aria-hidden />
      </div>
      <h2 className="text-lg font-bold text-[#0f3d73]">{title}</h2>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-500">{description}</p>
      <Link
        href={href}
        className={cn(
          "mt-7 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border-2 border-[#1e5a9e] bg-white text-sm font-semibold text-[#1e5a9e] transition-colors",
          "hover:bg-[#1e5a9e] hover:text-white",
        )}
      >
        Ingresar
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </article>
  );
}

export function HomeLanding() {
  const year = new Date().getFullYear();

  return (
    <div className="relative min-h-dvh bg-white">
      <div className="pointer-events-none fixed top-0 right-0 z-0 hidden h-dvh lg:block" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HERO_IMAGE.src}
          alt=""
          width={HERO_IMAGE.width}
          height={HERO_IMAGE.height}
          decoding="async"
          fetchPriority="high"
          className="block h-dvh w-auto max-w-none"
          style={{ width: "auto", height: "100dvh" }}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-5xl flex-col items-center px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex w-full flex-col items-center text-center">
          <Image
            src="/logo-piel360.png"
            alt="PIEL 360"
            width={575}
            height={210}
            priority
            className="object-contain"
            style={{ width: "min(100%, 300px)", height: "auto" }}
          />
        </header>

        <main className="flex w-full flex-1 flex-col items-center text-center">
          <h1 className="mt-10 text-3xl font-bold tracking-tight text-[#0f3d73] sm:text-[2rem] lg:mt-12">
            Bienvenido
          </h1>
          <p className="mt-3 max-w-xl text-base text-slate-600">
            Plataforma de diagnóstico dermatológico asistido por{" "}
            <span className="font-semibold text-[#1e5a9e]">IA</span>.
          </p>
          <p className="mt-8 text-sm font-medium text-slate-400">
            Selecciona el tipo de acceso para continuar
          </p>

          <div className="mt-6 flex w-full max-w-[980px] flex-wrap justify-center gap-5 lg:gap-6">
            {ACCESS_ROLES.map((role) => (
              <div key={role.id} className="w-full sm:w-[calc(50%-0.625rem)] lg:w-[calc(33.333%-1rem)]">
                <AccessCard {...role} />
              </div>
            ))}
          </div>
        </main>
        <footer className="mt-10 space-y-2 pb-4 text-center text-xs text-slate-400">
          <p className="inline-flex items-center justify-center gap-2">
            Tu información está protegida con los más altos estándares de seguridad.
          </p>
          <p>© {year} PIEL360. Todos los derechos reservados.</p>
        </footer>
      </div>
    </div>
  );
}
