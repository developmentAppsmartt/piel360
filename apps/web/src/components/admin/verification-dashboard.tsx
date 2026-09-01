"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Eye,
  FileText,
  Filter,
  ImagePlus,
  MapPin,
  MessageSquare,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
  Video,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-error";
import {
  useDoctor,
  useDeleteAddressVerificationEvidence,
  usePendingVerificationDoctors,
  useUpdateDoctorAddressVerification,
  useUpdateDoctorVerification,
  useUploadAddressVerificationEvidence,
  useVerificationStats,
  matchesVerificationGroup,
  accountTypeLabel,
  isEnterpriseDoctor,
  type Doctor,
  type VerificationListStatus,
} from "@/lib/queries/doctors";
import {
  ACCEPTED_LOCATION_TYPES,
  addressVerificationMethodLabel,
  computeVerificationCriteria,
  formatFullAddress,
  googleMapsUrl,
  locationTypeLabel,
  type CriterionStatus,
} from "@/lib/verification-criteria";
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

function TypeBadge({ doctor }: { doctor: Doctor }) {
  const enterprise = isEnterpriseDoctor(doctor);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        enterprise
          ? "bg-violet-50 text-violet-700"
          : "bg-sky-50 text-sky-700",
      )}
    >
      {enterprise ? (
        <Building2 className="size-3" />
      ) : (
        <UserRound className="size-3" />
      )}
      {accountTypeLabel(doctor)}
    </span>
  );
}

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

function formatDateShort(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function CriterionStatusBadge({ status }: { status: CriterionStatus }) {
  if (status === "fulfilled") {
    return (
      <span className="mt-2 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
        Cumplido
      </span>
    );
  }
  if (status === "in_review") {
    return (
      <span className="mt-2 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
        En revisión
      </span>
    );
  }
  return (
    <span className="mt-2 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
      Pendiente
    </span>
  );
}

function AddressVerifiedCell({ doctor }: { doctor: Doctor }) {
  const fullAddress = formatFullAddress(doctor, doctor.organization);
  const verified = doctor.addressVerificationStatus === "verified";
  const locLabel = locationTypeLabel(doctor.locationType);

  if (!fullAddress) {
    return <span className="text-muted-foreground">Sin dirección</span>;
  }

  return (
    <div className="max-w-[220px]">
      {verified ? (
        <div className="flex items-center gap-1.5 text-emerald-700">
          <span className="flex size-5 items-center justify-center rounded-full bg-emerald-100">
            <Check className="size-3" />
          </span>
          <span className="text-xs font-semibold">Verificada</span>
        </div>
      ) : (
        <span className="text-xs font-medium text-amber-700">
          {doctor.addressVerificationStatus === "in_review"
            ? "En revisión"
            : "Pendiente"}
        </span>
      )}
      <p className="mt-1 text-xs leading-snug text-muted-foreground">
        {fullAddress}
        {locLabel !== "—" ? (
          <>
            {" "}
            / <span className="font-medium text-foreground">{locLabel}</span>
          </>
        ) : null}
      </p>
    </div>
  );
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
  const addressVerify = useUpdateDoctorAddressVerification(doctorId);
  const uploadEvidence = useUploadAddressVerificationEvidence(doctorId);
  const deleteEvidence = useDeleteAddressVerificationEvidence(doctorId);
  const evidenceInputRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState("");
  const [addressMethod, setAddressMethod] = useState<
    "visit" | "google_maps" | "photo_evidence"
  >("google_maps");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<{
    url: string;
    isVideo: boolean;
  } | null>(null);

  useEffect(() => {
    setNote("");
    setError(null);
    setMessage(null);
    setLocalPreview((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return null;
    });
  }, [doctorId]);

  async function handleEvidenceFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setMessage(null);

    const isVideo = file.type.startsWith("video/");
    if (isVideo) {
      const durationOk = await new Promise<boolean>((resolve) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.onloadedmetadata = () => {
          URL.revokeObjectURL(video.src);
          resolve(video.duration > 0 && video.duration <= 60);
        };
        video.onerror = () => {
          URL.revokeObjectURL(video.src);
          resolve(false);
        };
        video.src = URL.createObjectURL(file);
      });
      if (!durationOk) {
        setError(
          "El video debe durar como máximo 60 segundos. Usa un clip corto de la locación.",
        );
        return;
      }
    }

    const previewUrl = URL.createObjectURL(file);
    setLocalPreview((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return { url: previewUrl, isVideo };
    });
    setAddressMethod("photo_evidence");

    try {
      await uploadEvidence.mutateAsync(file);
      setMessage(
        isVideo
          ? "Video de evidencia cargado."
          : "Imagen de evidencia cargada.",
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo subir la evidencia.",
      );
    }
  }

  async function handleDeleteEvidence() {
    setError(null);
    setMessage(null);
    try {
      await deleteEvidence.mutateAsync();
      setLocalPreview((prev) => {
        if (prev?.url) URL.revokeObjectURL(prev.url);
        return null;
      });
      if (evidenceInputRef.current) evidenceInputRef.current.value = "";
      setMessage("Evidencia eliminada.");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo eliminar la evidencia.",
      );
    }
  }

  async function decide(
    status: "active" | "rejected" | "in_review" | "pending",
  ) {
    setError(null);
    setMessage(null);
    const isEnt = doctor.data ? isEnterpriseDoctor(doctor.data) : false;
    if (status === "in_review" && !note.trim()) {
      setError("Escribe una observación para solicitar ajustes.");
      return;
    }
    try {
      await verify.mutateAsync({
        status,
        note: note.trim() || undefined,
      });
      setMessage(
        status === "active"
          ? isEnt
            ? "Cuenta Enterprise verificada y aprobada."
            : "Profesional verificado y aprobado."
          : status === "rejected"
            ? "Solicitud rechazada."
            : status === "pending"
              ? "Estado cambiado a pendiente. Volvió a la cola de verificación."
              : "Se solicitaron ajustes. El usuario verá la observación en su perfil.",
      );
      setNote("");
      onDone();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo actualizar el estado.",
      );
    }
  }

  async function markAddressVerified() {
    setError(null);
    setMessage(null);
    try {
      await addressVerify.mutateAsync({
        status: "verified",
        method: addressMethod,
      });
      setMessage("Dirección marcada como verificada.");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo verificar la dirección.",
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
  const enterprise = isEnterpriseDoctor(d);
  const org = d.organization ?? null;
  const pending =
    d.verificationStatus === "pending" ||
    d.verificationStatus === "in_review";
  const rejected = d.verificationStatus === "rejected";
  const canDecide = pending || rejected;

  const fullAddress = formatFullAddress(d, org);
  const mapsUrl = googleMapsUrl(d.lat ?? org?.lat ?? null, d.lng ?? org?.lng ?? null);
  const addressVerified = d.addressVerificationStatus === "verified";
  const evidenceUrl =
    localPreview?.url ?? d.addressVerificationEvidenceUrl ?? null;
  const evidenceIsVideo = localPreview
    ? localPreview.isVideo
    : /\.(mp4|webm|mov)(\?|$)/i.test(
        d.addressVerificationEvidenceKey ?? "",
      ) ||
      /\.(mp4|webm|mov)(\?|$)/i.test(
        d.addressVerificationEvidenceUrl ?? "",
      );
  const hasEvidence = Boolean(
    evidenceUrl || d.addressVerificationEvidenceKey,
  );

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
              {enterprise && org?.name
                ? org.name
                : `${d.firstName} ${d.lastName}`}
            </p>
            {enterprise ? (
              <>
                <p className="truncate text-sm text-muted-foreground">
                  {org?.legalRepName?.trim() ||
                    `${d.firstName} ${d.lastName}`.trim()}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {d.user?.email ?? "—"}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {org?.businessPhone ?? d.phone ?? "Sin teléfono"}
                </p>
              </>
            ) : (
              <>
                <p className="truncate text-sm text-muted-foreground">
                  {d.user?.email ?? "—"}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {d.phone ?? "Sin teléfono"}
                </p>
              </>
            )}
            <div className="mt-2">
              <TypeBadge doctor={d} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        {!enterprise ? (
          <section>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Información general
            </h3>
            <dl className="space-y-2 text-sm">
              {(
                [
                  ["Tipo de usuario", accountTypeLabel(d)],
                  ["Especialidad", d.specialty],
                  ["N.° licencia", d.licenseNumber],
                  ["Registro médico", d.medicalRegistry],
                  ["Institución", d.graduationInstitution ?? d.educationEntity],
                  ["País", d.country],
                  ["Ciudad", d.city],
                  ["Departamento", d.department],
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
        ) : null}

        {enterprise && org ? (
          <section className="space-y-3">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Información de empresa
            </h3>
            <dl className="space-y-2 text-sm">
              {(
                [
                  ["Nombre empresa", org.name],
                  [
                    "Subtipo",
                    org.type === "empresa_aliada"
                      ? "Empresa aliada"
                      : "Membresía empresa",
                  ],
                  ["CIIU", org.ciiuCode],
                  ["Correo empresarial", org.businessEmail],
                  ["Teléfono empresarial", org.businessPhone],
                  ["Sitio web", org.website],
                  ["Empleados (aprox.)", org.employeeCountRange],
                  ["Representante legal", org.legalRepName],
                  [
                    "Doc. representante",
                    org.legalRepDocType || org.legalRepDocNumber
                      ? `${org.legalRepDocType ?? ""} ${org.legalRepDocNumber ?? ""}`.trim()
                      : null,
                  ],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right font-medium">
                    {(value ?? "").toString().trim() || "—"}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Documentos de empresa
              </p>
              <DocRow
                title="Cédula del representante legal"
                url={org.legalRepCedulaDocUrl}
                fileKey={org.legalRepCedulaDocKey}
              />
              <DocRow
                title="RUT de la empresa"
                url={org.rutDocUrl}
                fileKey={org.rutDocKey}
              />
              <DocRow
                title="Certificado de existencia y representación legal"
                url={org.existenceCertDocUrl}
                fileKey={org.existenceCertDocKey}
              />
            </div>
          </section>
        ) : enterprise ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Cuenta empresa sin organización asociada o sin datos comerciales
            cargados.
          </p>
        ) : null}

        <section className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {enterprise
                ? "Dirección de la sede"
                : "Dirección registrada y verificada"}
            </h3>
            {addressVerified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                <Check className="size-3" />
                Verificada
              </span>
            ) : d.addressVerificationStatus === "in_review" ? (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                En revisión
              </span>
            ) : (
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                Pendiente
              </span>
            )}
          </div>

          {fullAddress ? (
            <>
              <p className="flex items-start gap-2 text-sm font-medium">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{fullAddress}</span>
              </p>
              <dl className="space-y-2 text-sm">
                {(
                  [
                    ["Tipo de locación", locationTypeLabel(d.locationType)],
                    [
                      "Fecha de verificación",
                      formatDateShort(d.addressVerifiedAt),
                    ],
                    [
                      "Método de verificación",
                      addressVerificationMethodLabel(
                        d.addressVerificationMethod,
                      ),
                    ],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="text-right font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex flex-wrap gap-2 pt-1">
                {evidenceUrl ? (
                  evidenceIsVideo ? (
                    <div className="w-full overflow-hidden rounded-xl border border-border bg-card">
                      <video
                        src={evidenceUrl}
                        controls
                        className="max-h-48 w-full bg-black object-contain"
                      />
                      <a
                        href={evidenceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 border-t border-border px-3 py-2 text-sm font-medium text-primary hover:bg-muted/50"
                      >
                        <Video className="size-4" />
                        Abrir video
                      </a>
                    </div>
                  ) : (
                    <a
                      href={evidenceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block w-full overflow-hidden rounded-xl border border-border bg-card"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={evidenceUrl}
                        alt="Evidencia de dirección"
                        className="max-h-48 w-full object-contain bg-muted/30"
                      />
                      <span className="flex items-center justify-center gap-2 border-t border-border px-3 py-2 text-sm font-medium text-primary hover:bg-muted/50">
                        <Eye className="size-4" />
                        Ver evidencia
                      </span>
                    </a>
                  )
                ) : (
                  <span className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                    <MessageSquare className="size-4" />
                    Sin evidencia cargada
                  </span>
                )}
                {mapsUrl ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10"
                  >
                    <MapPin className="size-4" />
                    Google Maps
                  </a>
                ) : null}
              </div>

              {!addressVerified ? (
                <div className="space-y-3 border-t border-border pt-3">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-foreground">
                      Evidencia (imagen o video corto)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      JPG/PNG/WebP o video MP4/WebM/MOV de hasta 60 s · máx. 25 MB
                    </p>
                    <input
                      ref={evidenceInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                      className="sr-only"
                      onChange={(e) =>
                        void handleEvidenceFile(e.target.files?.[0])
                      }
                    />
                    <button
                      type="button"
                      disabled={
                        uploadEvidence.isPending || deleteEvidence.isPending
                      }
                      onClick={() => evidenceInputRef.current?.click()}
                      className={cn(
                        "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-3 py-5 text-sm transition-colors",
                        uploadEvidence.isPending
                          ? "border-primary/40 bg-primary/5 text-primary"
                          : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:bg-muted/40",
                      )}
                    >
                      {uploadEvidence.isPending ? (
                        <>
                          <Upload className="size-5 animate-bounce" />
                          Subiendo evidencia…
                        </>
                      ) : (
                        <>
                          <span className="flex items-center gap-2">
                            <ImagePlus className="size-5" />
                            <Video className="size-5" />
                          </span>
                          {hasEvidence
                            ? "Reemplazar evidencia"
                            : "Subir imagen o video corto"}
                        </>
                      )}
                    </button>
                    {hasEvidence ? (
                      <button
                        type="button"
                        disabled={
                          uploadEvidence.isPending || deleteEvidence.isPending
                        }
                        onClick={() => void handleDeleteEvidence()}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      >
                        <Trash2 className="size-4" />
                        {deleteEvidence.isPending
                          ? "Eliminando…"
                          : "Eliminar evidencia"}
                      </button>
                    ) : null}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Confirma la existencia real de la locación física.
                  </p>
                  <select
                    value={addressMethod}
                    onChange={(e) =>
                      setAddressMethod(
                        e.target.value as typeof addressMethod,
                      )
                    }
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    <option value="google_maps">Google Maps</option>
                    <option value="visit">Visita presencial</option>
                    <option value="photo_evidence">
                      Evidencia fotográfica / video
                    </option>
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={
                      addressVerify.isPending ||
                      (addressMethod === "photo_evidence" && !hasEvidence)
                    }
                    onClick={() => void markAddressVerified()}
                  >
                    Marcar dirección verificada
                  </Button>
                  {addressMethod === "photo_evidence" && !hasEvidence ? (
                    <p className="text-xs text-amber-700">
                      Sube una imagen o video corto antes de verificar con este
                      método.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {enterprise
                ? "La empresa no ha registrado una dirección con coordenadas."
                : "El profesional no ha registrado una dirección con coordenadas."}
            </p>
          )}
        </section>

        {!enterprise ? (
          <section className="space-y-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Documentos del profesional
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
        ) : null}

        {canDecide ? (
          <section>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Observaciones {rejected ? "(recomendadas)" : "(opcional)"}
            </h3>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              placeholder={
                rejected
                  ? enterprise
                    ? "Motivo del cambio de estado o qué debe corregir la empresa…"
                    : "Motivo del cambio de estado o qué debe corregir el profesional…"
                  : enterprise
                    ? "Indica qué debe corregir la empresa…"
                    : "Indica qué debe corregir el profesional…"
              }
              className="min-h-24 w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">
              {note.length}/500 · Obligatoria al solicitar ajustes
            </p>
          </section>
        ) : null}

        {d.verificationNote ? (
          <section className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
            <p className="text-xs font-semibold tracking-wide uppercase">
              Última observación enviada
            </p>
            <p className="mt-1 whitespace-pre-wrap">{d.verificationNote}</p>
          </section>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      </div>

      {canDecide ? (
        <div className="flex flex-wrap gap-2 border-t border-border bg-muted/30 px-4 py-3">
          {pending ? (
            <Button
              type="button"
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
              disabled={verify.isPending}
              onClick={() => void decide("rejected")}
            >
              Rechazar
            </Button>
          ) : null}
          {rejected ? (
            <Button
              type="button"
              variant="outline"
              disabled={verify.isPending}
              onClick={() => void decide("pending")}
            >
              Volver a pendiente
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            disabled={verify.isPending || !note.trim()}
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
  const selectedDoctorQuery = useDoctor(selectedId ?? "");
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
        `${d.firstName} ${d.lastName} ${d.user?.email ?? ""} ${d.specialty ?? ""} ${d.organization?.name ?? ""}`.toLowerCase();
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
        ? "Profesionales y empresas verificadas"
        : "Solicitudes rechazadas";

  const criteriaDoctor =
    selectedDoctorQuery.data ??
    (selectedId ? doctors.find((d) => d.id === selectedId) : null) ??
    filtered[0] ??
    null;
  const criteria = criteriaDoctor
    ? computeVerificationCriteria(criteriaDoctor)
    : null;

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
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="bg-muted/40 text-xs tracking-wide text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Usuario</th>
                    <th className="px-4 py-3 font-semibold">Tipo</th>
                    <th className="px-4 py-3 font-semibold">
                      Especialidad / tipo de empresa
                    </th>
                    <th className="px-4 py-3 font-semibold">Registro</th>
                    <th className="px-4 py-3 font-semibold">
                      Dirección verificada
                    </th>
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
                                {isEnterpriseDoctor(d) && d.organization?.name
                                  ? d.organization.name
                                  : `${d.firstName} ${d.lastName}`}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {isEnterpriseDoctor(d) && d.organization?.legalRepName
                                  ? d.organization.legalRepName
                                  : (d.user?.email ?? "—")}
                              </p>
                              {isEnterpriseDoctor(d) ? (
                                <p className="truncate text-xs text-muted-foreground">
                                  {d.user?.email ?? "—"}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <TypeBadge doctor={d} />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {d.specialty ?? d.organization?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(d.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <AddressVerifiedCell doctor={d} />
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
        <p className="mt-1 text-xs text-muted-foreground">
          {criteria?.enterprise
            ? "Se valida que los datos comerciales y documentos legales de la empresa estén completos y que la sede tenga existencia real."
            : "Se valida que la información sea coherente, esté completa y que la dirección registrada tenga existencia real."}
          {criteriaDoctor ? (
            <>
              {" "}
              Mostrando estado de{" "}
              <span className="font-medium text-foreground">
                {isEnterpriseDoctor(criteriaDoctor) && criteriaDoctor.organization?.name
                  ? criteriaDoctor.organization.name
                  : `${criteriaDoctor.firstName} ${criteriaDoctor.lastName}`}
              </span>
              .
            </>
          ) : null}
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-4">
          {(
            [
              {
                title: "Información coherente",
                desc: "Datos personales y profesionales consistentes y válidos.",
                status: criteria?.coherentInfo ?? "pending",
                icon: ShieldCheck,
                highlight: false,
                enterpriseOnly: false,
                professionalOnly: true,
              },
              {
                title: "Documentos legibles y válidos",
                desc: "Cédula, registro y diploma claros y vigentes.",
                status: criteria?.validDocs ?? "pending",
                icon: ShieldCheck,
                highlight: false,
                enterpriseOnly: false,
                professionalOnly: true,
              },
              {
                title: "Datos de la empresa",
                desc: "Razón social, CIIU, representante legal y documentos legales.",
                status: criteria?.enterpriseData ?? "pending",
                icon: ShieldCheck,
                highlight: false,
                enterpriseOnly: true,
                professionalOnly: false,
              },
              {
                title: "Documentos legales de empresa",
                desc: "Cédula del representante, RUT y certificado de existencia.",
                status: criteria?.validDocs ?? "pending",
                icon: ShieldCheck,
                highlight: false,
                enterpriseOnly: true,
                professionalOnly: false,
              },
              {
                title: "Dirección verificada",
                desc: criteria?.enterprise
                  ? "Existencia real de la sede confirmada."
                  : "Existencia real de locación física confirmada.",
                status: criteria?.addressVerified ?? "pending",
                icon: MapPin,
                highlight: criteria?.addressVerified === "in_review",
                enterpriseOnly: false,
                professionalOnly: false,
              },
            ] as const
          )
            .filter((card) =>
              criteria?.enterprise
                ? card.enterpriseOnly ||
                  (!card.enterpriseOnly && !card.professionalOnly)
                : !card.enterpriseOnly,
            )
            .map(({ title, desc, status, icon: Icon, highlight }) => (
              <div
                key={title}
                className={cn(
                  "flex flex-col rounded-xl border bg-card p-4",
                  highlight
                    ? "border-primary shadow-sm ring-1 ring-primary/20"
                    : "border-border",
                )}
              >
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </div>
                <p className="mt-3 text-sm font-medium">{title}</p>
                <p className="mt-1 flex-1 text-xs text-muted-foreground">
                  {desc}
                </p>
                <CriterionStatusBadge status={status} />
              </div>
            ))}

          <div className="flex flex-col rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-medium">Tipos de locación aceptados</p>
            <ul className="mt-3 flex-1 space-y-2 text-xs text-muted-foreground">
              {ACCEPTED_LOCATION_TYPES.map((item) => (
                <li key={item.id} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
              Se verifica mediante visita, evidencia fotográfica o Google Maps.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
