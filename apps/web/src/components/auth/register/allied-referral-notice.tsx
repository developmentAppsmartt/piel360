import type { AlliedReferral } from "./use-allied-referral";

/** Estado del código de empresa aliada en los registros. */
export function AlliedReferralNotice({
  loading,
  error,
  referral,
}: {
  loading: boolean;
  error: string | null;
  referral: AlliedReferral | null;
}) {
  return (
    <>
      {loading ? (
        <p className="text-center text-sm text-zinc-500">Validando código de empresa aliada…</p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {referral ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-4 text-center">
          <p className="text-xs font-medium tracking-wide text-sky-700 uppercase">Registro con empresa aliada</p>
          <p className="mt-1 text-sm text-sky-800">{referral.organizationName}</p>
          <p className="mt-2 font-mono text-xl font-semibold tracking-wider text-sky-950">{referral.code}</p>
          <p className="mt-1 text-xs text-sky-700">Código de referido (no editable)</p>
        </div>
      ) : null}
    </>
  );
}
