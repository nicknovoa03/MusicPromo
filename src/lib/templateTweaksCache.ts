import AsyncStorage from "@react-native-async-storage/async-storage";

const REMOTE_TEMPLATE_TWEAKS_CACHE_KEY = "musicpromo:remote-template-tweaks";

type TemplateTweaksCache = Record<string, string>;

async function readCache(): Promise<TemplateTweaksCache> {
  try {
    const raw = await AsyncStorage.getItem(REMOTE_TEMPLATE_TWEAKS_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return Object.entries(parsed as Record<string, unknown>).reduce<TemplateTweaksCache>(
      (acc, [key, value]) => {
        if (typeof value === "string" && key.trim()) {
          acc[key] = value;
        }
        return acc;
      },
      {},
    );
  } catch {
    return {};
  }
}

async function writeCache(next: TemplateTweaksCache): Promise<void> {
  try {
    await AsyncStorage.setItem(
      REMOTE_TEMPLATE_TWEAKS_CACHE_KEY,
      JSON.stringify(next),
    );
  } catch {
    // Ignore cache write failures.
  }
}

export async function getCachedTemplateTweaks(
  projectId: string,
): Promise<string | null> {
  const id = projectId.trim();
  if (!id) return null;
  const cache = await readCache();
  return cache[id] ?? null;
}

export async function setCachedTemplateTweaks(
  projectId: string,
  serializedTemplateTweaks: string,
): Promise<void> {
  const id = projectId.trim();
  if (!id) return;
  const value = serializedTemplateTweaks.trim();
  if (!value) return;
  const cache = await readCache();
  cache[id] = value;
  await writeCache(cache);
}
