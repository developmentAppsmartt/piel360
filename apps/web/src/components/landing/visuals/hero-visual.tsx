import Image from "next/image";
import { Activity, ScanFace, Stethoscope, Users } from "lucide-react";

/**
 * Composición del hero: el rostro con la malla del banner dentro de un
 * «escáner», y alrededor la app móvil, el CRM y un hallazgo dermatológico.
 * Los números son de muestra (es una maqueta de la interfaz), no datos.
 */
export function HeroVisual() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[520px]" aria-hidden>
      {/* Escáner */}
      <div className="absolute inset-[9%] rounded-full bg-white/40 shadow-[0_40px_120px_-40px_rgba(29,107,255,0.55)] backdrop-blur-sm" />
      <svg viewBox="0 0 100 100" className="landing-spin-slow absolute inset-[4%]">
        <circle cx="50" cy="50" r="48" fill="none" stroke="#1d6bff" strokeOpacity="0.35" strokeWidth="0.4" strokeDasharray="1 2.2" />
        <circle cx="50" cy="50" r="44" fill="none" stroke="#0fb5ba" strokeOpacity="0.45" strokeWidth="0.3" strokeDasharray="14 6" />
      </svg>
      <div className="absolute inset-[14%] overflow-hidden rounded-full border border-white/70">
        <Image
          src="/landing/rostro-malla.webp"
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 380px, 70vw"
          className="object-cover object-[60%_30%]"
        />
        <div className="landing-scan top-0" />
      </div>

      {/* App móvil */}
      <div className="landing-float absolute bottom-[2%] left-0 w-[34%] min-w-[128px] rounded-[1.6rem] border-[5px] border-[#0b2a52] bg-white p-2.5 shadow-2xl">
        <div className="mx-auto mb-2 h-1 w-8 rounded-full bg-slate-200" />
        <div className="flex items-center gap-1.5 text-[9px] font-semibold text-(--landing-turquoise-ink)">
          <ScanFace className="size-3" /> Análisis estético
        </div>
        <p className="mt-1.5 text-2xl leading-none font-extrabold text-(--landing-navy)">82</p>
        <p className="text-[9px] text-slate-500">Puntaje de la piel</p>
        {[
          ["Hidratación", 88, "#0fb5ba"],
          ["Poros", 71, "#1d6bff"],
          ["Manchas", 64, "#8b5cf6"],
        ].map(([label, value, color]) => (
          <div key={label as string} className="mt-1.5">
            <div className="flex justify-between text-[8px] text-slate-600">
              <span>{label}</span>
              <span>{value}</span>
            </div>
            <div className="mt-0.5 h-1 rounded-full bg-slate-100">
              <div className="h-1 rounded-full" style={{ width: `${value}%`, background: color as string }} />
            </div>
          </div>
        ))}
      </div>

      {/* CRM */}
      <div className="landing-float-slow absolute top-[2%] right-0 w-[44%] min-w-[160px] rounded-2xl border border-white/80 bg-white/90 p-3 shadow-xl backdrop-blur">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-(--landing-medical)">
          <Users className="size-3.5" /> CRM · Pacientes
        </div>
        <div className="mt-2 flex h-12 items-end gap-1">
          {[40, 62, 48, 75, 58, 90, 70].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-gradient-to-t from-[#1d6bff] to-[#0fb5ba]"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <p className="mt-1.5 text-[9px] text-slate-500">Análisis de la semana</p>
      </div>

      {/* Hallazgo dermatológico */}
      <div className="landing-float absolute right-[2%] bottom-[16%] rounded-2xl border border-white/80 bg-white/90 px-3 py-2 shadow-xl backdrop-blur">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-(--landing-navy)">
          <Stethoscope className="size-3.5 text-(--landing-electric)" /> Lesión analizada
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[9px] text-slate-600">
          <Activity className="size-3 text-emerald-600" /> Riesgo bajo · seguimiento
        </div>
      </div>
    </div>
  );
}
