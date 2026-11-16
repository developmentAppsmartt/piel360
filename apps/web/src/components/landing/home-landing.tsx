import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, Star, UserRound } from "lucide-react";

const ACCESS_ROLES = [
  { id: "usuario", title: "Soy Usuario", href: "/doctor/login", icon: UserRound },
  { id: "admin", title: "Soy Administrador", href: "/admin/login", icon: ShieldCheck },
  { id: "moderador", title: "Soy Moderador", href: "/moderador/login", icon: Star },
] as const;

const HERO_IMAGE = {
  src: "/landin-home.png",
  width: 1157,
  height: 1606,
} as const;

/** Toda la tarjeta es el enlace: ícono y título, como en la referencia del
 * cliente. */
function AccessCard({ title, href, icon: Icon }: (typeof ACCESS_ROLES)[number]) {
  return (
    <Link
      href={href}
      className="group flex h-full w-full flex-col items-center gap-4 rounded-3xl border border-slate-100 bg-white/90 px-6 py-8 text-center shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-[0_20px_50px_-12px_rgba(30,90,158,0.35)] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#1e5a9e]"
    >
      <span className="flex size-[76px] items-center justify-center rounded-full border-2 border-[#1e5a9e] text-[#1e5a9e] transition-colors group-hover:bg-[#1e5a9e] group-hover:text-white">
        <Icon className="size-8" strokeWidth={1.5} aria-hidden />
      </span>
      <span className="text-lg font-bold text-[#1e5a9e]">{title}</span>
    </Link>
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
          <p className="mt-6 text-2xl font-bold text-[#0f3d73] sm:text-3xl">Bienvenido</p>
          <h1 className="mt-2 text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            <span className="block text-[#0f3d73]">Lo que no se mide</span>
            <span className="block bg-gradient-to-r from-[#0fb5ba] to-[#1d8fe0] bg-clip-text text-transparent">
              no se mejora.
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-base text-pretty text-slate-700 sm:text-lg">
            Mide cada procedimiento, sigue a tus pacientes a distancia, reduce la incertidumbre
            clínica y demuestra resultados, con apoyo asistido por inteligencia artificial.
          </p>
          <p className="mt-6 text-sm font-medium text-[#5b8fd1]">
            Selecciona el tipo de acceso para continuar
          </p>

          <nav aria-label="Tipo de acceso" className="mt-5 grid w-full max-w-[980px] gap-5 sm:grid-cols-3 lg:gap-6">
            {ACCESS_ROLES.map((role) => (
              <AccessCard key={role.id} {...role} />
            ))}
          </nav>
        </main>
        <footer className="mt-10 space-y-2 pb-4 text-center text-xs text-slate-400">
          <p>Tu información está protegida con los más altos estándares de seguridad.</p>
          <p>© {year} PIEL360. Todos los derechos reservados.</p>
        </footer>
      </div>
    </div>
  );
}
