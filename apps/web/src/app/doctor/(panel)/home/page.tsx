"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { isDoctorVerificationActive } from "@piel360/shared";
import { DoctorHomeDashboard } from "@/components/doctor/doctor-home-dashboard";
import { DoctorPendingOnboarding } from "@/components/doctor/doctor-pending-onboarding";
import { ApiError } from "@/lib/api-error";
import { useAnalyses } from "@/lib/queries/analyses";
import { isEnterpriseDoctor, useMyDoctorProfile } from "@/lib/queries/doctors";
import { useMyOrganization } from "@/lib/queries/organizations";
import { usePatients } from "@/lib/queries/patients";
import { useRoutines } from "@/lib/queries/routines";
import { useMySubscriptions } from "@/lib/queries/subscriptions";

export default function DoctorHomePage() {
  const router = useRouter();
  const profile = useMyDoctorProfile();
  const verified = isDoctorVerificationActive(profile.data?.verificationStatus);
  const dataEnabled = Boolean(profile.data);

  const org = useMyOrganization(
    Boolean(profile.data && isEnterpriseDoctor(profile.data)),
  );
  const subscriptions = useMySubscriptions(dataEnabled);
  const patients = usePatients(dataEnabled);
  const analyses = useAnalyses(dataEnabled);
  const routines = useRoutines(dataEnabled);

  useEffect(() => {
    if (!dataEnabled) return;
    const errors = [
      profile.error,
      subscriptions.error,
      patients.error,
      analyses.error,
      routines.error,
    ];
    if (errors.some((e) => e instanceof ApiError && e.status === 401)) {
      router.push("/doctor/login");
    }
  }, [
    profile.error,
    subscriptions.error,
    patients.error,
    analyses.error,
    routines.error,
    router,
    dataEnabled,
  ]);

  const { pending, recent, analysesCount, protocolsCount } = useMemo(() => {
    const all = analyses.data ?? [];
    const pendingList = all.filter((a) => !a.isConfirmed);
    const activeProtocols =
      routines.data?.filter((r) => r.isActive).length ?? 0;
    return {
      pending: pendingList,
      recent: [...all].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
      analysesCount: all.filter((a) => a.isValid).length,
      protocolsCount: activeProtocols,
    };
  }, [analyses.data, routines.data]);

  if (profile.isLoading) {
    return <p className="text-muted-foreground">Cargando…</p>;
  }

  if (!profile.data) {
    return (
      <p className="text-muted-foreground">
        No se pudo cargar tu perfil. Intenta recargar la página.
      </p>
    );
  }

  const loadingDashboard =
    patients.isLoading || analyses.isLoading || subscriptions.isLoading;

  return (
    <div className="space-y-6">
      <DoctorPendingOnboarding
        profile={profile.data}
        org={org.data}
        showProgressBanner={!verified}
      />

      <DoctorHomeDashboard
        profile={profile.data}
        verified={verified}
        patientCount={patients.data?.length ?? 0}
        pendingCount={pending.length}
        analysesCount={analysesCount}
        protocolsCount={protocolsCount}
        subscriptions={subscriptions.data ?? []}
        pendingAnalyses={pending.slice(0, 10)}
        recentAnalyses={recent.slice(0, 10)}
        patients={patients.data ?? []}
        loading={loadingDashboard}
      />
    </div>
  );
}
