"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Eye,
  FileText,
  Filter,
  Search,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-error";
import {
  useDoctor,
  usePendingVerificationDoctors,
  useUpdateDoctorVerification,
  useVerificationStats,
  matchesVerificationGroup,
  type Doctor,
  type VerificationListStatus,
} from "@/lib/queries/doctors";
import { cn } from "@/lib/utils";
import Link from "next/link";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  in_review: "En revisión",
  verified: "Verificado",
  approved: "Verificado",
  active: "Verificado",
  rejected: "Rechazado",
};

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase() || "?";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DocRow({
  title,
  url,
  fileKey,
}: {
  title: string;
  url?: string | null;
  fileKey?: string | null;
}) {
  const uploaded = Boolean(url || fileKey);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <FileText className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">
          {uploaded ? "Documento cargado" : "Sin documento"}
        </p>
      </div>
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-[11px] font-semibold",
          uploaded
            ? "bg-emerald-50 text-emerald-700"
            : "bg-amber-50 text-amber-700",
        )}
      >
        {uploaded ? "Cargado" : "Pendiente"}
      </span>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg p-1.5 text-primary hover:bg-primary/10"
          title="Ver documento"
        >
          <Eye className="size-4" />
        </a>
      ) : null}
    </div>
  );
}

function DetailPanel({
  doctorId,
  onClose,
  onDone,
}: {
  doctorId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const doctor = useDoctor(doctorId);
  const verify = useUpdateDoctorVerification(doctorId);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setNote("");
    setError(null);
    setMessage(null);
  }, [doctorId]);

  async function decide(
    status: "active" | "rejected" | "in_review",
  ) {
    setError(null);
    setMessage(null);
    try {
      await verify.mutateAsync({
        status,
        note: note.trim() || undefined,
      });
      setMessage(
        status === "active"
          ? "Profesional verificado y aprobado."
          : status === "rejected"
            ? "Solicitud rechazada."
            : "Se solicitaron ajustes al profesional.",
      );
      onDone();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo actualizar el estado.",
      );
    }
  }

  if (doctor.isLoading) {
    return (
      <aside className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
        <p className="text-sm text-muted-foreground">Cargando detalle…</p>
      </aside>
    );
  }

  if (!doctor.data) {
    return (
      <aside className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
        <p className="text-sm text-destructive">No se pudo cargar el perfil.</p>
        <Button type="button" variant="outline" className="mt-3" onClick={onClose}>
          Cerrar
        </Button>
      </aside>
    );
  }

  const d = doctor.data;
  // Solo cola de revisión (no aprobados ni rechazados)
  const pending =
    d.verificationStatus === "pending" ||
    d.verificationStatus === "in_review";

  return (
    <aside className="flex max-h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            Detalle de la solicitud
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <XCircle className="size-5" />
          </button>
        </div>
        <div className="mt-4 flex items-start gap-3">
          <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-base font-bold text-primary">
            {d.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={d.avatarUrl}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              initials(d.firstName, d.lastName)
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">
              {d.firstName} {d.lastName}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {d.user?.email ?? "—"}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {d.phone ?? "Sin teléfono"}
            </p>
            <span className="mt-2 inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              Profesional
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <section>
          <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Información general
          </h3>
          <dl className="space-y-2 text-sm">
            {(
              [
                ["Tipo de usuario", "Profesional"],
                ["Especialidad", d.specialty],
                ["N.° licencia", d.licenseNumber],
                ["Registro médico", d.medicalRegistry],
                ["Institución", d.graduationInstitution ?? d.educationEntity],
                ["País", d.country],
                ["Ciudad", d.city],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right font-medium">
                  {value?.trim() || "—"}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Documentos enviados
          </h3>
          <DocRow
            title="Documento de identidad"
            url={d.cedulaDocUrl}
            fileKey={d.cedulaDocKey}
          />
          <DocRow
            title="Tarjeta profesional / registro"
            url={d.medicalRegistryDocUrl}
            fileKey={d.medicalRegistryDocKey}
          />
          <DocRow
            title="Diploma"
            url={d.diplomaDocUrl}
            fileKey={d.diplomaDocKey}
          />
        </section>

        {pending ? (
          <section>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Observaciones (opcional)
            </h3>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              placeholder="Agrega un comentario para el profesional…"
              className="min-h-24 w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">
              {note.length}/500
            </p>
          </section>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      </div>

      {pending ? (
        <div className="flex flex-wrap gap-2 border-t border-border bg-muted/30 px-4 py-3">
          <Button
            type="button"
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/10"
            disabled={verify.isPending}
            onClick={() => void decide("rejected")}
          >
            Rechazar
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={verify.isPending}
            onClick={() => void decide("in_review")}
          >
            Solicitar ajustes
          </Button>
          <Button
            type="button"
            className="flex-1"
            disabled={verify.isPending}
            onClick={() => void decide("active")}
          >
            Verificar y aprobar
          </Button>
        </div>
      ) : null}
    </aside>
  );
}

export function VerificationDashboard({
  status = "pending",
}: {
  status?: VerificationListStatus;
}) {
  const list = usePendingVerificationDoctors(status);
  const stats = useVerificationStats();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");

  const doctors = list.data ?? [];

  const specialties = useMemo(() => {
    const set = new Set<string>();
    for (const d of doctors) {
      if (d.specialty?.trim()) set.add(d.specialty.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [doctors]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return doctors.filter((d) => {
      if (!matchesVerificationGroup(d.verificationStatus, status)) return false;
      if (
        specialtyFilter !== "all" &&
        (d.specialty ?? "").trim() !== specialtyFilter
      ) {
        return false;
      }
      if (!q) return true;
      const hay =
        `${d.firstName} ${d.lastName} ${d.user?.email ?? ""} ${d.specialty ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [doctors, search, specialtyFilter, status]);

  useEffect(() => {
    if (selectedId && !filtered.some((d) => d.id === selectedId)) {
      setSelectedId(filtered[0]?.id ?? null);
    }
  }, [filtered, selectedId]);

  const titleByStatus =
    status === "pending"
      ? "Solicitudes pendientes de verificación"
      : status === "active"
        ? "Profesionales verificados"
        : "Solicitudes rechazadas";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Verificación de profesionales y empresas
            </h1>
            <ShieldCheck className="size-6 text-primary" />
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Revisa y valida la información enviada por profesionales y empresas
            aliadas antes de activar su acceso a la plataforma.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(
          [
            {
              label: "Pendientes",
              value: stats.data?.pending ?? "—",
              icon: ClipboardCheck,
              tone: "bg-primary/10 text-primary",
              href: "/admin/verificacion",
              active: status === "pending",
            },
            {
              label: "Aprobados",
              value: stats.data?.approved ?? "—",
              icon: CheckCircle2,
              tone: "bg-emerald-50 text-emerald-700",
              href: "/admin/verificacion/verificados",
              active: status === "active",
            },
            {
              label: "Rechazados",
              value: stats.data?.rejected ?? "—",
              icon: XCircle,
              tone: "bg-orange-50 text-orange-700",
              href: "/admin/verificacion/rechazados",
              active: status === "rejected",
            },
            {
              label: "Total verificados",
              value: stats.data?.totalVerified ?? "—",
              icon: UserRound,
              tone: "bg-sky-50 text-sky-700",
              href: "/admin/verificacion/verificados",
              active: status === "active",
            },
          ] as const
        ).map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={cn(
              "rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/40",
              card.active
                ? "border-primary/50 ring-1 ring-primary/20"
                : "border-border",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <span
                className={cn(
                  "flex size-9 items-center justify-center rounded-xl",
                  card.tone,
                )}
              >
                <card.icon className="size-4" />
              </span>
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {card.value}
            </p>
          </Link>
        ))}
      </div>

      <div
        className={cn(
          "grid gap-4",
          selectedId ? "xl:grid-cols-[minmax(0,1fr)_380px]" : "grid-cols-1",
        )}
      >
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold">{titleByStatus}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[180px] flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre o correo…"
                  className="h-10 w-full rounded-xl border border-input bg-background pr-3 pl-9 text-sm outline-none focus:border-primary"
                />
              </div>
              <select
                value={specialtyFilter}
                onChange={(e) => setSpecialtyFilter(e.target.value)}
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
              >
                <option value="all">Todas las especialidades</option>
                {specialties.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <Button type="button" variant="outline" className="gap-2">
                <Filter className="size-4" />
                Filtros
              </Button>
            </div>
          </div>

          {list.isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Cargando…</p>
          ) : list.isError ? (
            <p className="p-6 text-sm text-destructive">
              No se pudo cargar la cola de verificación.
            </p>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No hay solicitudes en esta bandeja.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-muted/40 text-xs tracking-wide text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Usuario</th>
                    <th className="px-4 py-3 font-semibold">Tipo</th>
                    <th className="px-4 py-3 font-semibold">Especialidad</th>
                    <th className="px-4 py-3 font-semibold">Registro</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                    <th className="px-4 py-3 font-semibold" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d: Doctor) => {
                    const active = selectedId === d.id;
                    return (
                      <tr
                        key={d.id}
                        className={cn(
                          "cursor-pointer border-t border-border transition-colors hover:bg-muted/30",
                          active && "bg-primary/5",
                        )}
                        onClick={() => setSelectedId(d.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {d.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={d.avatarUrl}
                                  alt=""
                                  className="size-full object-cover"
                                />
                              ) : (
                                initials(d.firstName, d.lastName)
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {d.firstName} {d.lastName}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {d.user?.email ?? "—"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
                            <Building2 className="size-3" />
                            Profesional
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {d.specialty ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(d.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                              d.verificationStatus === "rejected"
                                ? "bg-orange-50 text-orange-700"
                                : d.verificationStatus === "active" ||
                                    d.verificationStatus === "approved" ||
                                    d.verificationStatus === "verified"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700",
                            )}
                          >
                            {STATUS_LABELS[d.verificationStatus] ??
                              d.verificationStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <ChevronRight className="ml-auto size-4 text-muted-foreground" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
                Mostrando {filtered.length} de {doctors.length} resultados
              </div>
            </div>
          )}
        </section>

        {selectedId ? (
          <DetailPanel
            doctorId={selectedId}
            onClose={() => setSelectedId(null)}
            onDone={() => {
              // Mantener panel abierto; la lista se refresca sola.
            }}
          />
        ) : null}
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="text-sm font-semibold">Criterios de verificación</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["Información coherente", "Datos personales y profesionales consistentes."],
              [
                "Documentos legibles y válidos",
                "Cédula, registro y diploma claros y vigentes.",
              ],
              [
                "Especialidad relacionada",
                "Perfil alineado al ejercicio dermatológico / estético.",
              ],
              [
                "Cumplimiento de requisitos",
                "Licencia y formación acordes a la normativa.",
              ],
            ] as const
          ).map(([title, desc]) => (
            <div key={title} className="flex gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
