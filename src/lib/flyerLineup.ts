import type {
  FlyerLineup,
  FlyerLineupItem,
  FlyerLineupLayout,
} from "@/lib/flyerDraft";

export type LineupLayout = FlyerLineupLayout;

export const LINEUP_INTRO_PRESETS = [
  "SOUNDS BY",
  "MUSIC BY",
  "DJ SET BY",
  "FEATURING",
  "WITH",
] as const;

export const MAX_LINEUP_ITEMS = 10;

export function suggestLineupLayout(itemCount: number): LineupLayout {
  if (itemCount <= 0) return "grid";
  if (itemCount === 1) return "single";
  if (itemCount <= 4) return "grid";
  if (itemCount <= 8) return "column";
  return "festival";
}

export function normalizeLineup(lineup: FlyerLineup): FlyerLineup {
  const items = (lineup.items ?? [])
    .slice(0, MAX_LINEUP_ITEMS)
    .map((item) => ({
      name: item.name?.trim() ?? "",
      headliner: Boolean(item.headliner),
      setTime: item.setTime?.trim() || null,
    }))
    .filter((item) => item.name.length > 0);

  let headlinerSeen = false;
  const normalizedItems = items.map((item) => {
    if (!item.headliner) return { ...item, headliner: false };
    if (headlinerSeen) return { ...item, headliner: false };
    headlinerSeen = true;
    return item;
  });

  const layout =
    lineup.layout && lineup.layout !== "single"
      ? lineup.layout
      : suggestLineupLayout(normalizedItems.length);

  return {
    items: normalizedItems,
    showSetTimes: lineup.showSetTimes !== false,
    layout: normalizedItems.length === 1 ? "single" : layout,
    introLabel: lineup.introLabel?.trim() || null,
  };
}

export function setLineupHeadliner(
  lineup: FlyerLineup,
  index: number,
): FlyerLineup {
  const normalized = normalizeLineup(lineup);
  return {
    ...normalized,
    items: normalized.items.map((item, i) => ({
      ...item,
      headliner: i === index,
    })),
  };
}

export function clearLineupHeadliner(lineup: FlyerLineup): FlyerLineup {
  const normalized = normalizeLineup(lineup);
  return {
    ...normalized,
    items: normalized.items.map((item) => ({ ...item, headliner: false })),
  };
}

export function moveLineupItem(
  lineup: FlyerLineup,
  fromIndex: number,
  toIndex: number,
): FlyerLineup {
  const normalized = normalizeLineup(lineup);
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= normalized.items.length ||
    toIndex >= normalized.items.length ||
    fromIndex === toIndex
  ) {
    return normalized;
  }
  const items = [...normalized.items];
  const [moved] = items.splice(fromIndex, 1);
  items.splice(toIndex, 0, moved!);
  return { ...normalized, items };
}

export function lineupToTemplateActs(
  lineup: FlyerLineup,
): { time: string; name: string; headliner: boolean }[] {
  const normalized = normalizeLineup(lineup);
  return normalized.items.map((item) => ({
    time:
      normalized.showSetTimes && item.setTime ? item.setTime.toUpperCase() : "",
    name: item.name.toUpperCase(),
    headliner: Boolean(item.headliner),
  }));
}

export function getHeadliner(lineup: FlyerLineup): FlyerLineupItem | null {
  const normalized = normalizeLineup(lineup);
  return normalized.items.find((item) => item.headliner) ?? null;
}
