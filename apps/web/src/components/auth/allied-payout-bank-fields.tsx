"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClientFetch } from "@/lib/api-client";

export type WompiBankOption = { id: string; name: string; code?: string };

const DOC_TYPES = ["CC", "NIT", "CE"] as const;

export type AlliedPayoutFieldsValue = {
  bankId: string;
  bankName: string;
  bankAccountType: string;
  bankAccountNumber: string;
  payoutBeneficiaryName: string;
  payoutBeneficiaryEmail: string;
  payoutLegalIdType: string;
  payoutLegalId: string;
};

type Props = {
  value: AlliedPayoutFieldsValue;
  onChange: (patch: Partial<AlliedPayoutFieldsValue>) => void;
  /** public = registro sin sesión; me = owner autenticado */
  banksSource?: "public" | "me";
  inputClassName: string;
};

export function AlliedPayoutBankFields({
  value,
  onChange,
  banksSource = "me",
  inputClassName,
}: Props) {
  const banks = useQuery({
    queryKey: ["wompi-banks", banksSource],
    queryFn: () =>
      apiClientFetch<WompiBankOption[]>(
        banksSource === "public"
          ? "/public/wompi-banks"
          : "/organizations/wompi-banks",
      ),
    retry: false,
    staleTime: 5 * 60_000,
  });

  const hasCatalog = (banks.data?.length ?? 0) > 0;

  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold">
        Cuenta para dispersión de comisiones
      </h3>
      <p className="mb-3 text-xs text-muted-foreground">
        Datos <strong>independientes</strong> del registro de la app: titular y
        cuenta bancaria donde Wompi pagará las comisiones de referidos.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Nombre del beneficiario</span>
          <input
            className={inputClassName}
            value={value.payoutBeneficiaryName}
            onChange={(e) =>
              onChange({ payoutBeneficiaryName: e.target.value })
            }
            placeholder="Nombre del titular de la cuenta"
            required
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Email del beneficiario</span>
          <input
            className={inputClassName}
            type="email"
            value={value.payoutBeneficiaryEmail}
            onChange={(e) =>
              onChange({ payoutBeneficiaryEmail: e.target.value })
            }
            placeholder="correo@empresa.com"
            required
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Documento del beneficiario (CC/NIT)</span>
          <select
            className={inputClassName}
            value={value.payoutLegalIdType || "NIT"}
            onChange={(e) => onChange({ payoutLegalIdType: e.target.value })}
            required
          >
            {DOC_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Número de documento</span>
          <input
            className={inputClassName}
            value={value.payoutLegalId}
            onChange={(e) =>
              onChange({
                payoutLegalId: e.target.value.replace(/[^\dA-Za-z-]/g, ""),
              })
            }
            placeholder="Solo dígitos (sin puntos)"
            inputMode="numeric"
            required
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Banco (Wompi)</span>
          {hasCatalog ? (
            <select
              className={inputClassName}
              value={value.bankId}
              onChange={(e) => {
                const id = e.target.value;
                const selected = (banks.data ?? []).find((b) => b.id === id);
                onChange({
                  bankId: id,
                  bankName: selected?.name ?? "",
                });
              }}
              required
            >
              <option value="">Seleccionar banco</option>
              {(banks.data ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                  {b.code ? ` (${b.code})` : ""}
                </option>
              ))}
            </select>
          ) : (
            <input
              className={inputClassName}
              value={value.bankName}
              onChange={(e) =>
                onChange({ bankName: e.target.value, bankId: "" })
              }
              placeholder="Nombre del banco"
              required
            />
          )}
          {banks.isError || (banks.isSuccess && !hasCatalog) ? (
            <span className="text-[11px] text-amber-700">
              No hay catálogo Wompi: en Admin → Pasarelas completa{" "}
              <strong>Pagos a Terceros</strong> (API key, User principal id y
              Account ID) y guarda. Sin eso no se puede elegir el banco con
              bankId válido para dispersión.
            </span>
          ) : null}
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Tipo de cuenta</span>
          <select
            className={inputClassName}
            value={value.bankAccountType || "AHORROS"}
            onChange={(e) => onChange({ bankAccountType: e.target.value })}
            required
          >
            <option value="AHORROS">Ahorros</option>
            <option value="CORRIENTE">Corriente</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
          <span className="font-medium">Número de cuenta</span>
          <input
            className={inputClassName}
            value={value.bankAccountNumber}
            onChange={(e) =>
              onChange({
                bankAccountNumber: e.target.value.replace(/\D/g, ""),
              })
            }
            placeholder="Solo dígitos"
            inputMode="numeric"
            required
          />
        </label>
      </div>
    </div>
  );
}
