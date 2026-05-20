import type { FlyerDraftInput, FlyerLineup, FlyerTemplateId } from "@/lib/flyerDraft";
import { defaultFlyerLineup, parseFlyerLineup } from "@/lib/flyerDraft";
import { lineupToTemplateActs, normalizeLineup } from "@/lib/flyerLineup";
import { formatEventTimeRange } from "@/lib/flyerEventTime";

export type FlyerTemplateData = {
  badge?: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  tagline: string;
  footer: string;
  lineup: FlyerLineup;
  lineupActs: { time: string; name: string; headliner: boolean }[];
  presenter?: string;
  titleA?: string;
  titleB?: string;
  iridescentSubtitle?: string;
  artists?: string;
  genres?: string;
  age?: string;
  date?: string;
  time?: string;
  venue?: string;
  overline?: string;
  djLabel?: string;
  djs?: string[];
};

export const FLYER_TEMPLATE_OPTIONS: {
  id: FlyerTemplateId;
  label: string;
}[] = [
  { id: "heat", label: "Heat" },
  { id: "iridescent", label: "Iridescent" },
  { id: "vintage", label: "Vintage" },
];

export const FLYER_BACKGROUND_PRESETS: Record<
  FlyerTemplateId,
  { id: string; label: string; gradient: string[] }[]
> = {
  heat: [
    {
      id: "heat-default",
      label: "Default",
      gradient: ["#6a5a18", "#3a1a18", "#1a0808"],
    },
    {
      id: "heat-sunset",
      label: "Sunset",
      gradient: ["#FF6B35", "#F7C59F", "#3a1a18"],
    },
    {
      id: "heat-forest",
      label: "Forest",
      gradient: ["#2E294E", "#1B998B", "#1a0808"],
    },
  ],
  iridescent: [
    {
      id: "irid-default",
      label: "Default",
      gradient: ["#ffcce7", "#b3d9ff", "#d6b3ff"],
    },
    {
      id: "irid-candy",
      label: "Candy",
      gradient: ["#ffcce7", "#ffe09e", "#c6f0d4"],
    },
  ],
  vintage: [
    {
      id: "vin-default",
      label: "Default",
      gradient: ["#c89568", "#888070", "#4a5450"],
    },
    {
      id: "vin-warm",
      label: "Warm",
      gradient: ["#e8a060", "#a8856a", "#6a7560"],
    },
  ],
};

export const FLYER_ACCENT_SWATCHES = [
  "#FFD936",
  "#FF6B6B",
  "#FFFFFF",
  "#A8E6CF",
  "#B3D9FF",
  "#D6B3FF",
];

function formatEventDate(isoOrDisplay: string | undefined): string {
  if (!isoOrDisplay?.trim()) return "SAT APR 25";
  const d = new Date(isoOrDisplay);
  if (Number.isNaN(d.getTime())) return isoOrDisplay.toUpperCase();
  return d
    .toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
    .toUpperCase()
    .replace(/\./g, "");
}

function splitEventTitle(name: string): { title: string; subtitle: string } {
  const trimmed = name.trim() || "DISCO";
  const words = trimmed.split(/\s+/);
  if (words.length <= 1) {
    return { title: trimmed.toUpperCase(), subtitle: "at dusk" };
  }
  return {
    title: words[0]!.toUpperCase(),
    subtitle: words.slice(1).join(" ").toLowerCase(),
  };
}

export function buildFlyerTemplateData(
  draft: FlyerDraftInput,
  lineup?: FlyerLineup,
): FlyerTemplateData {
  const eventName = draft.eventName?.trim() || "Disco at Dusk";
  const { title, subtitle } = splitEventTitle(eventName);
  const date = formatEventDate(draft.eventDate);
  const time =
    formatEventTimeRange(draft.eventTime, draft.eventEndTime) || "4PM – 8PM";
  const venue = draft.venue?.trim() || "Neon Grotto Rooftop";
  const city = draft.city?.trim();
  const footerVenue = city ? `${venue} · ${city}` : venue;
  const footer = `${date}  |  ${time}  |  ${footerVenue.toUpperCase()}`;
  const parsedLineup = normalizeLineup(
    lineup ?? parseFlyerLineup(draft.lineupJson) ?? defaultFlyerLineup(),
  );
  const acts = lineupToTemplateActs(parsedLineup);

  const words = eventName.split(/\s+/);
  const titleA = (words[0] ?? "EUPHOR").toUpperCase();
  const titleB = (words.slice(1).join(" ") || "EASTER").toUpperCase();

  const iridescentSubtitle = draft.tagline?.trim() || "highland basement party";

  return {
    badge: "HAPPY HOUR · 4-7PM",
    eyebrow: draft.eyebrow?.trim() || "ROOFTOP DAY PARTY",
    title,
    subtitle,
    tagline: draft.tagline?.trim() || "house / disco / grooves",
    footer,
    lineup: parsedLineup,
    lineupActs: acts,
    presenter: "JAXX EVENTS & HIGHLAND PRESENT",
    titleA,
    titleB,
    iridescentSubtitle,
    artists: acts.map((a) => a.name).slice(0, 2).join("  ×  ") || "KIWI  ×  FVLL3N 3GO",
    genres: "HOUSE / TECHNO / DISCO / GHETTOTECH",
    age: "18+",
    date,
    time,
    venue: city ? `${venue}, ${city}`.toUpperCase() : venue.toUpperCase(),
    overline: "thursday",
    djLabel: "WITH DJs",
    djs: acts.slice(0, 2).map((a) => a.name),
  };
}

export function resolveBackgroundGradient(
  templateId: FlyerTemplateId,
  backgroundKey: string | undefined,
): string[] {
  const presets = FLYER_BACKGROUND_PRESETS[templateId];
  const match = presets.find((p) => p.id === backgroundKey);
  return match?.gradient ?? presets[0]!.gradient;
}
