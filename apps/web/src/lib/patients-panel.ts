export type PatientsPanel = "doctor" | "admin";

export function patientsListPath(panel: PatientsPanel) {
  return panel === "doctor" ? "/doctor/pacientes" : "/admin/pacientes";
}

export function patientDetailPath(panel: PatientsPanel, patientId: string) {
  return `${patientsListPath(panel)}/${patientId}`;
}

export function patientComparisonsPath(panel: PatientsPanel, patientId: string) {
  return `${patientDetailPath(panel, patientId)}/comparaciones`;
}
