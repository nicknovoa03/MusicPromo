import AsyncStorage from "@react-native-async-storage/async-storage";

const LOCAL_PROFILE_PREFERENCES_KEY = "musicpromo:local-profile-preferences";

type LocalAspectRatio = "9:16" | "1:1";
type LocalVideoLength = 15 | 30 | 60;

export type LocalProfilePreferences = {
  defaultAspectRatio: LocalAspectRatio;
  defaultVideoLength: LocalVideoLength;
};

export const DEFAULT_LOCAL_PROFILE_PREFERENCES: LocalProfilePreferences = {
  defaultAspectRatio: "9:16",
  defaultVideoLength: 15,
};

function normalizeAspectRatio(value: unknown): LocalAspectRatio {
  return value === "1:1" ? "1:1" : "9:16";
}

function normalizeVideoLength(value: unknown): LocalVideoLength {
  if (value === 30 || value === 60) return value;
  return 15;
}

function normalizePreferences(value: unknown): LocalProfilePreferences {
  if (!value || typeof value !== "object") {
    return DEFAULT_LOCAL_PROFILE_PREFERENCES;
  }

  const input = value as Record<string, unknown>;
  return {
    defaultAspectRatio: normalizeAspectRatio(input.defaultAspectRatio),
    defaultVideoLength: normalizeVideoLength(input.defaultVideoLength),
  };
}

export async function getLocalProfilePreferences(): Promise<LocalProfilePreferences> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_PROFILE_PREFERENCES_KEY);
    if (!raw) return DEFAULT_LOCAL_PROFILE_PREFERENCES;
    return normalizePreferences(JSON.parse(raw));
  } catch (error) {
    console.warn("Failed to read local profile preferences:", error);
    return DEFAULT_LOCAL_PROFILE_PREFERENCES;
  }
}

export async function setLocalProfilePreferences(
  updates: Partial<LocalProfilePreferences>
): Promise<LocalProfilePreferences> {
  const current = await getLocalProfilePreferences();
  const next = normalizePreferences({ ...current, ...updates });

  try {
    await AsyncStorage.setItem(LOCAL_PROFILE_PREFERENCES_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn("Failed to save local profile preferences:", error);
  }

  return next;
}
