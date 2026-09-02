import { redirect } from "next/navigation";

/** Alias legado → ruta canónica del módulo clínico. */
export default function LegacySkinAgeRulesRedirect() {
  redirect("/doctor/reglas-edad-piel");
}
