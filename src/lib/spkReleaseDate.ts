/** ISO calendar date stored in drafts and Convex (local timezone, no time component). */
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function toSpkReleaseDateStorage(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseSpkReleaseDateToDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const iso = ISO_DATE_RE.exec(trimmed);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]) - 1;
    const day = Number(iso[3]);
    const date = new Date(year, month, day);
    if (
      date.getFullYear() === year &&
      date.getMonth() === month &&
      date.getDate() === day
    ) {
      return date;
    }
    return null;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatSpkReleaseDateLabel(value?: string | null): string {
  const trimmed = value?.trim();
  if (!trimmed) return "";
  const date = parseSpkReleaseDateToDate(trimmed);
  if (!date) return trimmed;
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Normalize legacy locale strings to ISO before persisting. */
export function normalizeSpkReleaseDateStored(value?: string | null): string {
  const trimmed = value?.trim();
  if (!trimmed) return "";
  if (ISO_DATE_RE.test(trimmed)) return trimmed;
  const date = parseSpkReleaseDateToDate(trimmed);
  return date ? toSpkReleaseDateStorage(date) : trimmed;
}
