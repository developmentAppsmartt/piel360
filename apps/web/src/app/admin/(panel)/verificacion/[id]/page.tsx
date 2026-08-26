"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { DoctorVerificationActions } from "@/components/admin/doctor-verification-actions";
import { useDoctor } from "@/lib/queries/doctors";

function DocBlock({
  title,
  url,
  fileKey,
}: {
  title: string;
  url?: string | null;
  fileKey?: string | null;
}) {
  const isPdf = `${url ?? ""} ${fileKey ?? ""}`.toLowerCase().includes(".pdf");
  return (
    <div className="space-y-2 rounded-xl border border-border p-3">
      <p className="text-sm font-medium">{title}</p>
      {!url ? (
        <p className="text-xs text-muted-foreground">Sin documento</p>
      ) : isPdf ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="block rounded-lg bg-muted/40 px-3 py-8 text-center text-sm text-sky-700 underline"
        >
          Ver PDF
        </a>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={title}
          className="h-48 w-full rounded-lg object-contain bg-muted/30"
        />
      )}
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 border-b border-border py-2 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2 font-medium">{value?.trim() || "—"}</dd>
    </div>
  );
}

export default function VerificacionDoctorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const doctor = useDoctor(id);

  if (doctor.isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando perfil…</p>;
  }
  if (!doctor.data) {
    return (
      <p className="text-sm text-destructive">No se pudo cargar el doctor.</p>
    );
  }

  const d = doctor.data;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/admin/verificacion"
            className="text-sm text-sky-700 underline"
          >
            ← Volver a verificación
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">
            {d.firstName} {d.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">{d.user.email}</p>
        </div>
        <DoctorVerificationActions
          doctorId={id}
          verificationStatus={d.verificationStatus}
          onDone={() => {
            setTimeout(() => router.push("/admin/verificacion"), 800);
          }}
        />
      </div>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-2 text-sm font-semibold">Datos personales</h2>
        <dl>
          <Row label="Teléfono" value={d.phone} />
          <Row
            label="Documento"
            value={
              d.docType || d.docNumber
                ? `${d.docType ?? ""} ${d.docNumber ?? ""}`.trim()
                : null
            }
          />
          <Row label="Género" value={d.gender} />
          <Row
            label="Nacimiento"
            value={
              d.birthDate
                ? new Date(d.birthDate).toLocaleDateString("es-CO")
                : null
            }
          />
          <Row label="Especialidad" value={d.specialty} />
          <Row label="Registro médico" value={d.medicalRegistry} />
          <Row label="Licencia" value={d.licenseNumber} />
          <Row label="Ciudad" value={d.city} />
          <Row label="País" value={d.country} />
          <Row label="Dirección" value={d.address} />
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Documentos</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <DocBlock
            title="Cédula"
            url={d.cedulaDocUrl}
            fileKey={d.cedulaDocKey}
          />
          <DocBlock
            title="Registro médico"
            url={d.medicalRegistryDocUrl}
            fileKey={d.medicalRegistryDocKey}
          />
          <DocBlock
            title="Diploma"
            url={d.diplomaDocUrl}
            fileKey={d.diplomaDocKey}
          />
        </div>
      </section>
    </div>
  );
}
