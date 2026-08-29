"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CloudUpload, LocateFixed, Search } from "lucide-react";
import type { MembershipType } from "@piel360/shared";
import { LocationPickerMap, type LatLng } from "@/components/maps";
import {
  establishSessionAction,
  type AuthActionState,
} from "@/lib/actions/auth";
import { homeForUser } from "@/lib/auth-redirect";
import { ApiError } from "@/lib/api-error";
import { registerDoctorWithDocuments } from "@/lib/doctor-register-client";
import { useSpecialties } from "@/lib/queries/specialties";

const DOC_TYPES = ["CC", "CE", "TI", "PA"] as const;

const GENDER_OPTIONS = [
  { value: "female", label: "Femenino" },
  { value: "male", label: "Masculino" },
  { value: "other", label: "Otro" },
] as const;

const MEMBERSHIP_OPTIONS: {
  value: MembershipType;
  label: string;
  hint: string;
}[] = [
  {
    value: "solo_doctor",
    label: "Solo doctor",
    hint: "Consulta individual sin equipo.",
  },
  {
    value: "empresa",
    label: "Membresía empresa",
    hint: "Equipos según plan de espacios.",
  },
  {
    value: "empresa_aliada",
    label: "Empresa aliada",
    hint: "Equipos con programa de referidos.",
  },
];

type GeocodeResult = {
  display_name: string;
  lat: string;
  lon: string;
};

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function Field({
  label,
  children,
  required,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm text-zinc-900">
      <span className="font-medium">
        {label}
        {required ? (
          <span className="text-red-500"> *</span>
        ) : (
          <span className="font-normal text-zinc-400"> (opcional)</span>
        )}
      </span>
      {hint ? <span className="text-xs text-zinc-500">{hint}</span> : null}
      {children}
    </label>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-sky-500 disabled:bg-zinc-50";

function DocUploadCard({
  title,
  file,
  onChange,
}: {
  title: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-3 py-5 text-center transition hover:border-sky-400">
      <CloudUpload className="size-7 text-sky-500" />
      <span className="text-sm font-semibold text-zinc-900">{title}</span>
      <span className="text-xs text-zinc-500">
        {file ? file.name : "PDF, JPG o PNG · opcional"}
      </span>
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        className="sr-only"
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          onChange(e.target.files?.[0] ?? null);
        }}
      />
    </label>
  );
}

export function DoctorRegisterForm() {
  const router = useRouter();
  const specialtiesQuery = useSpecialties();
  const specialties = specialtiesQuery.data?.map((item) => item.name) ?? [];
  const [state, setState] = useState<AuthActionState>({});
  const [isPending, setIsPending] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneDisplay, setPhoneDisplay] = useState("");
  const [docType, setDocType] = useState<string>(DOC_TYPES[0]);
  const [docNumber, setDocNumber] = useState("");
  const [gender, setGender] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [medicalRegistry, setMedicalRegistry] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [educationEntity, setEducationEntity] = useState("");
  const [graduationInstitution, setGraduationInstitution] = useState("");
  const [membershipType, setMembershipType] =
    useState<MembershipType>("solo_doctor");
  const [addressQuery, setAddressQuery] = useState("");
  const [address, setAddress] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [location, setLocation] = useState<LatLng | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const searchAbort = useRef<AbortController | null>(null);
  /** Evita re-buscar en Nominatim cuando el texto viene del mapa / GPS. */
  const suppressAddressSearch = useRef(false);

  useEffect(() => {
    if (!specialty && specialties[0]) {
      setSpecialty(specialties[0]);
    }
  }, [specialties, specialty]);

  const [cedula, setCedula] = useState<File | null>(null);
  const [medicalRegistryDoc, setMedicalRegistryDoc] = useState<File | null>(
    null,
  );
  const [diploma, setDiploma] = useState<File | null>(null);

  const phone = digitsOnly(phoneDisplay);
  const phoneValid = /^\d{10,15}$/.test(phone);

  useEffect(() => {
    if (suppressAddressSearch.current) {
      suppressAddressSearch.current = false;
      return;
    }

    const q = addressQuery.trim();
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      searchAbort.current?.abort();
      const controller = new AbortController();
      searchAbort.current = controller;
      setSearchLoading(true);
      try {
        const url = new URL("https://nominatim.openstreetmap.org/search");
        url.searchParams.set("q", q);
        url.searchParams.set("format", "json");
        url.searchParams.set("addressdetails", "1");
        url.searchParams.set("limit", "5");
        url.searchParams.set("countrycodes", "co");
        const res = await fetch(url.toString(), {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("geocode");
        const data = (await res.json()) as GeocodeResult[];
        setSuggestions(data);
        setSearchOpen(true);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setSuggestions([]);
        }
      } finally {
        setSearchLoading(false);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      searchAbort.current?.abort();
    };
  }, [addressQuery]);

  async function reverseGeocode(lat: number, lng: number) {
    try {
      const url = new URL("https://nominatim.openstreetmap.org/reverse");
      url.searchParams.set("lat", String(lat));
      url.searchParams.set("lon", String(lng));
      url.searchParams.set("format", "json");
      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return;
      const data = (await res.json()) as { display_name?: string };
      if (!data.display_name) return;
      suppressAddressSearch.current = true;
      setAddress(data.display_name);
      setAddressQuery(data.display_name);
      setSuggestions([]);
      setSearchOpen(false);
    } catch {
      /* el pin basta */
    }
  }

  function selectSuggestion(item: GeocodeResult) {
    const lat = Number(item.lat);
    const lng = Number(item.lon);
    suppressAddressSearch.current = true;
    setAddress(item.display_name);
    setAddressQuery(item.display_name);
    setLocation({ lat, lng });
    setSuggestions([]);
    setSearchOpen(false);
    setGeoError(null);
  }

  function useCurrentLocation() {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("Tu navegador no soporta geolocalización.");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLocation({ lat, lng });
        setGeoLoading(false);
        await reverseGeocode(lat, lng);
      },
      () => {
        setGeoError(
          "No se pudo obtener tu ubicación. Busca la dirección o marca el mapa.",
        );
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState({});
    if (!phoneValid) {
      setState({
        error:
          "Celular inválido — usa solo dígitos, con indicativo de país (10 a 15).",
      });
      return;
    }
    if (!location) {
      setState({
        error: "Busca o marca la ubicación exacta de tu consulta.",
      });
      return;
    }

    const { firstName, lastName } = splitFullName(fullName);
    if (!firstName || !lastName) {
      setState({ error: "Ingresa tu nombre completo." });
      return;
    }
    if (!docNumber.trim()) {
      setState({ error: "Ingresa el número de documento." });
      return;
    }

    setIsPending(true);
    try {
      const { result, docUploadError } = await registerDoctorWithDocuments(
        {
          email: email.trim(),
          password,
          firstName,
          lastName,
          phone,
          membershipType,
          specialty,
          address: address || addressQuery,
          country: "CO",
          lat: location.lat,
          lng: location.lng,
          docType: docType || undefined,
          docNumber: docNumber.trim() || undefined,
          gender: gender || undefined,
          birthDate: birthDate || undefined,
          medicalRegistry: medicalRegistry.trim() || undefined,
          licenseNumber: licenseNumber.trim() || undefined,
          educationEntity: educationEntity.trim() || undefined,
          graduationInstitution: graduationInstitution.trim() || undefined,
        },
        { cedula, medicalRegistryDoc, diploma },
      );

      await establishSessionAction(result.accessToken, result.refreshToken);
      if (docUploadError) {
        setState({ error: docUploadError });
        setIsPending(false);
        return;
      }
      router.push(homeForUser(result.user));
    } catch (err) {
      setIsPending(false);
      if (err instanceof ApiError) {
        setState({ error: err.message });
        return;
      }
      setState({ error: "No se pudo conectar con el servidor." });
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-3xl space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-sm sm:p-8"
    >
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Registro de doctor
        </h1>
        <p className="text-sm text-zinc-500">
          Los campos con * son obligatorios. El resto es opcional y puedes
          completarlo después en tu perfil.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre completo" required>
          <input
            className={inputClass}
            placeholder="Ana María Gómez"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            autoComplete="name"
          />
        </Field>
        <Field label="Correo profesional" required>
          <input
            className={inputClass}
            type="email"
            placeholder="ana@clinica.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </Field>
        <Field label="Celular" required>
          <input
            className={inputClass}
            type="tel"
            placeholder="+57 300 000 0000"
            value={phoneDisplay}
            onChange={(e) => setPhoneDisplay(e.target.value)}
            required
            autoComplete="tel"
          />
        </Field>
        <Field label="Tipo de documento" required>
          <select
            className={inputClass}
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            required
          >
            {DOC_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Número de documento" required>
          <input
            className={inputClass}
            placeholder="1234567890"
            value={docNumber}
            onChange={(e) => setDocNumber(e.target.value)}
            required
            autoComplete="off"
          />
        </Field>
        <Field label="Género">
          <select
            className={inputClass}
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            <option value="">Seleccionar</option>
            {GENDER_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Fecha de nacimiento">
          <input
            className={inputClass}
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
          />
        </Field>
        <Field label="Especialidad" required>
          <select
            className={inputClass}
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            required
            disabled={specialtiesQuery.isLoading || specialties.length === 0}
          >
            {specialtiesQuery.isLoading ? (
              <option value="">Cargando especialidades…</option>
            ) : null}
            {specialties.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Contraseña" required>
          <input
            className={inputClass}
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
          />
        </Field>
        <Field label="Registro médico">
          <input
            className={inputClass}
            placeholder="RM-123456"
            value={medicalRegistry}
            onChange={(e) => setMedicalRegistry(e.target.value)}
          />
        </Field>
        <Field label="Número de licencia">
          <input
            className={inputClass}
            placeholder="LIC-0098"
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
          />
        </Field>
        <Field label="Entidad educativa">
          <input
            className={inputClass}
            placeholder="Universidad"
            value={educationEntity}
            onChange={(e) => setEducationEntity(e.target.value)}
          />
        </Field>
        <Field label="Institución de egreso">
          <input
            className={inputClass}
            placeholder="Facultad / Instituto"
            value={graduationInstitution}
            onChange={(e) => setGraduationInstitution(e.target.value)}
          />
        </Field>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-zinc-900">
          Tipo de cuenta <span className="text-red-500">*</span>
        </legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {MEMBERSHIP_OPTIONS.map((opt) => {
            const selected = membershipType === opt.value;
            return (
              <label
                key={opt.value}
                className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${
                  selected
                    ? "border-sky-500 bg-sky-50"
                    : "border-zinc-200 bg-white hover:border-zinc-300"
                }`}
              >
                <input
                  type="radio"
                  name="membershipType"
                  className="mt-1"
                  checked={selected}
                  onChange={() => setMembershipType(opt.value)}
                />
                <span>
                  <span className="block text-sm font-medium">{opt.label}</span>
                  <span className="block text-xs text-zinc-500">{opt.hint}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Ubicación: búsqueda por encima del mapa (Leaflet usa z-index altos) */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">
              Ubicación <span className="text-red-500">*</span>
            </h2>
            <p className="text-xs text-zinc-500">
              Busca la dirección exacta o usa tu ubicación actual.
            </p>
          </div>
          <button
            type="button"
            onClick={useCurrentLocation}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-sm hover:bg-zinc-50"
          >
            <LocateFixed className="size-4 text-sky-500" />
            {geoLoading ? "Obteniendo…" : "Usar mi ubicación"}
          </button>
        </div>

        <div className="relative isolate z-[1100]">
          <Field label="Buscar dirección exacta" required>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
              <input
                className={`${inputClass} pl-9`}
                placeholder="Ej. Calle 100 #19-54, Bogotá"
                value={addressQuery}
                onChange={(e) => {
                  setAddressQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => suggestions.length > 0 && setSearchOpen(true)}
                onBlur={() => {
                  window.setTimeout(() => setSearchOpen(false), 150);
                }}
                autoComplete="street-address"
              />
            </div>
          </Field>
          {searchLoading && (
            <p className="mt-1 text-xs text-zinc-500">Buscando…</p>
          )}
          {searchOpen && suggestions.length > 0 && (
            <ul className="absolute top-full right-0 left-0 z-[1200] mt-1 max-h-52 overflow-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-xl">
              {suggestions.map((item) => (
                <li key={`${item.lat}-${item.lon}-${item.display_name}`}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm text-zinc-800 hover:bg-sky-50"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectSuggestion(item)}
                  >
                    {item.display_name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="relative z-0 overflow-hidden rounded-xl border border-zinc-200">
          <LocationPickerMap
            value={location}
            onChange={(pos) => {
              setLocation(pos);
              setGeoError(null);
              void reverseGeocode(pos.lat, pos.lng);
            }}
            className="h-56 w-full"
          />
        </div>
        {location && (
          <p className="text-xs text-zinc-500">
            {address || "Ubicación marcada"} · Lat {location.lat.toFixed(5)}, Lng{" "}
            {location.lng.toFixed(5)}
          </p>
        )}
        {geoError && <p className="text-sm text-red-600">{geoError}</p>}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Subida de documentos</h2>
          <p className="text-xs text-zinc-500">
            Opcional. Puedes cargarlos más adelante al completar tu registro.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <DocUploadCard title="Cédula" file={cedula} onChange={setCedula} />
          <DocUploadCard
            title="Registro Médico"
            file={medicalRegistryDoc}
            onChange={setMedicalRegistryDoc}
          />
          <DocUploadCard title="Diploma" file={diploma} onChange={setDiploma} />
        </div>
      </section>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="h-12 w-full rounded-xl bg-sky-500 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-40 sm:w-auto sm:px-10"
      >
        {isPending ? "Creando cuenta…" : "Crear cuenta"}
      </button>

      <p className="text-center text-sm text-zinc-500">
        ¿Ya tienes cuenta?{" "}
        <Link href="/doctor/login" className="text-sky-600 underline">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}
