import AsyncStorage from "@react-native-async-storage/async-storage";

const REMOTE_TEMPLATE_TWEAKS_CACHE_KEY = "musicpromo:remote-template-tweaks";

// TTL for cached tweaks to avoid unbounded growth and stale data retention (30 days)
const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
// Max number of entries kept in cache; oldest entries beyond this are pruned
const DEFAULT_MAX_ENTRIES = 200;

type CacheEntry = {
  value: string;
  updatedAt: number; // epoch ms
};

type TemplateTweaksCache = Record<string, CacheEntry>;

async function readCache(): Promise<TemplateTweaksCache> {
  try {
    const raw = await AsyncStorage.getItem(REMOTE_TEMPLATE_TWEAKS_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    // Back-compat: older cache stored plain strings instead of { value, updatedAt }
    const now = Date.now();
    return Object.entries(parsed as Record<string, unknown>).reduce<TemplateTweaksCache>(
      (acc, [key, value]) => {
        const k = key.trim();
        if (!k) return acc;
        if (
          value &&
          typeof value === "object" &&
          "value" in (value as Record<string, unknown>) &&
          typeof (value as Record<string, unknown>)["value"] === "string"
        ) {
          const v = value as { value: string; updatedAt?: number };
          acc[k] = { value: v.value, updatedAt: v.updatedAt ?? now };
        } else if (typeof value === "string") {
          // migrate legacy string entry
          acc[k] = { value, updatedAt: now };
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
    await AsyncStorage.setItem(REMOTE_TEMPLATE_TWEAKS_CACHE_KEY, JSON.stringify(next));
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
  const entry = cache[id];
  if (!entry) return null;
  // TTL enforcement
  if (entry.updatedAt && Date.now() - entry.updatedAt > DEFAULT_TTL_MS) {
    // Expired — delete and return null
    delete cache[id];
    await writeCache(cache);
    return null;
  }
  return entry.value ?? null;
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
  cache[id] = { value, updatedAt: Date.now() };
  await pruneCache(cache, DEFAULT_MAX_ENTRIES);
  await writeCache(cache);
}

/**
 * Remove a single project's cached template tweaks (e.g., on project delete).
 */
export async function deleteCachedTemplateTweaks(projectId: string): Promise<void> {
  const id = projectId.trim();
  if (!id) return;
  const cache = await readCache();
  if (cache[id]) {
    delete cache[id];
    await writeCache(cache);
  }
}

/**
 * Prune cache entries based on TTL and/or max entries. Can be invoked periodically
 * or right after writes to avoid unbounded growth.
 */
export async function pruneTemplateTweaksCache(options?: { maxEntries?: number; ttlMs?: number }): Promise<void> {
  const cache = await readCache();
  const ttl = options?.ttlMs ?? DEFAULT_TTL_MS;
  const maxEntries = options?.maxEntries ?? DEFAULT_MAX_ENTRIES;
  const now = Date.now();

  // Remove expired
  for (const [k, v] of Object.entries(cache)) {
    if (!v || typeof v.updatedAt !== "number" || now - v.updatedAt > ttl) {
      delete cache[k];
    }
  }

  await pruneCache(cache, maxEntries);
  await writeCache(cache);
}

async function pruneCache(cache: TemplateTweaksCache, maxEntries: number): Promise<void> {
  const entries = Object.entries(cache);
  if (entries.length <= maxEntries) return;
  // Sort by updatedAt ascending (oldest first)
  entries.sort((a, b) => (a[1].updatedAt ?? 0) - (b[1].updatedAt ?? 0));
  const toRemove = entries.length - maxEntries;
  for (let i = 0; i < toRemove; i += 1) {
    const [key] = entries[i];
    delete cache[key];
  }
}
