"use client";

import { AlliedPayoutBankFields } from "@/components/auth/allied-payout-bank-fields";
import { Field, inputClass } from "@/components/auth/auth-form-primitives";
import { CatalogCombobox } from "@/components/auth/catalog-combobox";

const EMPLOYEE_RANGES = ["1-10", "11-50", "51-200", "201-500", "501+"] as const;
export const LEGAL_REP_DOC_TYPES = ["CC", "CE", "NIT", "PA"] as const;

export type CompanyValues = {
  organizationName: string;
  ciiuCode: string;
  ciiuLabel: string;
  businessEmail: string;
  businessPhone: string;
  website: string;
  employeeCountRange: string;
  legalRepName: string;
  legalRepDocType: string;
  legalRepDocNumber: string;
  bankId: string;
  bankName: string;
  bankAccountType: string;
  bankAccountNumber: string;
  payoutBeneficiaryName: string;
  payoutBeneficiaryEmail: string;
  payoutLegalIdType: string;
  payoutLegalId: string;
};

export const EMPTY_COMPANY: CompanyValues = {
  organizationName: "",
  ciiuCode: "",
  ciiuLabel: "",
  businessEmail: "",
  businessPhone: "",
  website: "",
  employeeCountRange: "",
  legalRepName: "",
  legalRepDocType: LEGAL_REP_DOC_TYPES[0],
  legalRepDocNumber: "",
  bankId: "",
  bankName: "",
  bankAccountType: "AHORROS",
  bankAccountNumber: "",
  payoutBeneficiaryName: "",
  payoutBeneficiaryEmail: "",
  payoutLegalIdType: "NIT",
  payoutLegalId: "",
};

/** El primer dato de la empresa que falta, o null. */
export function companyError(v: CompanyValues, allied: boolean): string | null {
  if (!v.organizationName.trim()) return "El nombre de la empresa es obligatorio.";
  if (!v.legalRepName.trim()) return "Indica el nombre del representante legal.";
  if (!v.legalRepDocNumber.trim()) return "Indica el documento del representante legal.";
  if (!allied) return null;
  if (!v.payoutBeneficiaryName.trim()) return "Indica el nombre del beneficiario de la cuenta de pago.";
  if (!v.payoutBeneficiaryEmail.trim()) return "Indica el email del beneficiario de la cuenta de pago.";
  if (!v.payoutLegalId.trim()) return "Indica el documento del beneficiario (CC/NIT) para dispersión.";
  if (!v.bankAccountNumber.trim()) return "Indica el número de cuenta para dispersión.";
  if (!v.bankId.trim() && !v.bankName.trim()) return "Indica el banco para dispersión.";
  return null;
}

/** Información de la empresa, representante legal y, si es aliada, la
 * cuenta de dispersión. `phoneField` es el campo de teléfono de contacto. */
export function EmpresaCompanyFields({
  value,
  onChange,
  allied,
  phoneField,
}: {
  value: CompanyValues;
  onChange: (next: CompanyValues) => void;
  allied: boolean;
  phoneField: React.ReactNode;
}) {
  const set = (patch: Partial<CompanyValues>) => onChange({ ...value, ...patch });
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Información de la empresa</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre de la empresa" required>
          <input
            className={inputClass}
            value={value.organizationName}
            onChange={(e) => set({ organizationName: e.target.value })}
            required
          />
        </Field>
        <Field label="Código CIIU principal" required>
          <CatalogCombobox
            typeSlug="ciiu_code"
            className={inputClass}
            placeholder="Busca la actividad económica"
            value={value.ciiuLabel}
            onSelect={(p) => set({ ciiuLabel: p.label, ciiuCode: p.code ?? "" })}
            required
          />
        </Field>
        <Field label="Correo electrónico empresarial" required>
          <input
            className={inputClass}
            type="email"
            value={value.businessEmail}
            onChange={(e) => set({ businessEmail: e.target.value })}
            required
          />
        </Field>
        <Field label="Teléfono de contacto" required>
          {phoneField}
        </Field>
        <Field label="Sitio web" required>
          <input
            className={inputClass}
            type="url"
            value={value.website}
            onChange={(e) => set({ website: e.target.value })}
            placeholder="https://"
            required
          />
        </Field>
        <Field label="Número de empleados (aprox.)" required>
          <select
            className={inputClass}
            value={value.employeeCountRange}
            onChange={(e) => set({ employeeCountRange: e.target.value })}
            required
          >
            <option value="">Seleccionar</option>
            {EMPLOYEE_RANGES.map((range) => (
              <option key={range} value={range}>
                {range}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold">Representante legal</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Nombre completo" required>
            <input
              className={inputClass}
              value={value.legalRepName}
              onChange={(e) => set({ legalRepName: e.target.value })}
              required
            />
          </Field>
          <Field label="Tipo de documento" required>
            <select
              className={inputClass}
              value={value.legalRepDocType}
              onChange={(e) => set({ legalRepDocType: e.target.value })}
              required
            >
              {LEGAL_REP_DOC_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Número de documento" required>
            <input
              className={inputClass}
              value={value.legalRepDocNumber}
              onChange={(e) => set({ legalRepDocNumber: e.target.value })}
              required
            />
          </Field>
        </div>
      </div>

      {allied ? (
        <AlliedPayoutBankFields
          banksSource="public"
          inputClassName={inputClass}
          value={{
            bankId: value.bankId,
            bankName: value.bankName,
            bankAccountType: value.bankAccountType,
            bankAccountNumber: value.bankAccountNumber,
            payoutBeneficiaryName: value.payoutBeneficiaryName,
            payoutBeneficiaryEmail: value.payoutBeneficiaryEmail,
            payoutLegalIdType: value.payoutLegalIdType,
            payoutLegalId: value.payoutLegalId,
          }}
          onChange={(patch) => {
            // El componente manda solo lo que cambió; los `undefined` no pisan.
            const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
            set(defined as Partial<CompanyValues>);
          }}
        />
      ) : null}
    </section>
  );
}
