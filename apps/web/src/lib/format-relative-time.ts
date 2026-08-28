/** Tiempo relativo corto en español (ej. "Hace 10 min"). */
export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Hace un momento";
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours === 1 ? "Hace 1 h" : `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return days === 1 ? "Hace 1 día" : `Hace ${days} días`;
  return new Date(iso).toLocaleDateString("es-CO", { dateStyle: "short" });
}
