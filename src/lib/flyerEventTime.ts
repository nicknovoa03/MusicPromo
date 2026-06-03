/** 24-hour clock stored as `HH:mm` (e.g. `16:00`). */

export type ParsedTime = {
  hour24: number;
  minute: number;
};

export function parseStoredTime(value: string | undefined): ParsedTime | null {
  if (!value?.trim()) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour24 = Number(match[1]);
  const minute = Number(match[2]);
  if (
    !Number.isFinite(hour24) ||
    !Number.isFinite(minute) ||
    hour24 < 0 ||
    hour24 > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }
  return { hour24, minute };
}

export function toStoredTime(hour24: number, minute: number): string {
  const h = Math.max(0, Math.min(23, Math.floor(hour24)));
  const m = Math.max(0, Math.min(59, Math.floor(minute)));
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function to12HourParts(parsed: ParsedTime): {
  hour12: number;
  minute: number;
  isPm: boolean;
} {
  const isPm = parsed.hour24 >= 12;
  const hour12Raw = parsed.hour24 % 12;
  return {
    hour12: hour12Raw === 0 ? 12 : hour12Raw,
    minute: parsed.minute,
    isPm,
  };
}

export function from12HourParts(
  hour12: number,
  minute: number,
  isPm: boolean,
): ParsedTime {
  let hour24 = hour12 % 12;
  if (isPm) hour24 += 12;
  return { hour24, minute: Math.max(0, Math.min(59, minute)) };
}

export function formatTimeDisplay(value: string | undefined): string {
  const parsed = parseStoredTime(value);
  if (!parsed) return value?.trim() ?? "";
  const { hour12, minute, isPm } = to12HourParts(parsed);
  const suffix = isPm ? "PM" : "AM";
  if (minute === 0) {
    return `${hour12}${suffix}`;
  }
  return `${hour12}:${String(minute).padStart(2, "0")}${suffix}`;
}

export function formatEventTimeRange(
  start: string | undefined,
  end?: string | undefined,
): string {
  const startLabel = formatTimeDisplay(start);
  if (!startLabel) return "";
  const endLabel = formatTimeDisplay(end);
  if (!endLabel) return startLabel;
  return `${startLabel} – ${endLabel}`;
}
