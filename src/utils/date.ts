const DAY_MS = 24 * 60 * 60 * 1000;

export function toISODate(input: Date): string {
  const year = input.getFullYear();
  const month = String(input.getMonth() + 1).padStart(2, "0");
  const day = String(input.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(baseISO: string, offset: number): string {
  const date = parseISODate(baseISO);
  const shifted = new Date(date.getTime() + offset * DAY_MS);
  return toISODate(shifted);
}

export function parseISODate(dateISO: string): Date {
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function formatDayLabel(dateISO: string): string {
  const date = parseISODate(dateISO);
  return date.toLocaleDateString("tr-TR", { weekday: "short" });
}

export function formatDateCompact(dateISO: string): string {
  const date = parseISODate(dateISO);
  return date.toLocaleDateString("tr-TR", { month: "short", day: "numeric" });
}

export function formatDateLong(dateISO: string): string {
  const date = parseISODate(dateISO);
  return date.toLocaleDateString("tr-TR", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}
