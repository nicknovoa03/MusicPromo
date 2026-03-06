import AsyncStorage from "@react-native-async-storage/async-storage";

const LOCAL_PROFILE_PREFERENCES_KEY = "musicpromo:local-profile-preferences";
const LOCAL_ARTIST_PROFILE_KEY = "musicpromo:local-artist-profile";

type LocalAspectRatio = "9:16" | "1:1";
type LocalVideoLength = 15 | 30 | 60;
export const PROFILE_LINK_PLATFORMS = [
  "spotify",
  "soundcloud",
  "apple-music",
  "youtube",
  "instagram",
  "tiktok",
  "x",
  "website",
] as const;

export type ProfileLinkPlatform = (typeof PROFILE_LINK_PLATFORMS)[number];
export type ProfileLink = {
  platform: ProfileLinkPlatform;
  url: string;
  sortOrder: number;
};
export type LocalArtistProfile = {
  artistName: string;
  avatarImageUrl: string | null;
  heroImageUrl: string | null;
  links: ProfileLink[];
};

export type LocalProfilePreferences = {
  defaultAspectRatio: LocalAspectRatio;
  defaultVideoLength: LocalVideoLength;
};

export const DEFAULT_LOCAL_PROFILE_PREFERENCES: LocalProfilePreferences = {
  defaultAspectRatio: "9:16",
  defaultVideoLength: 15,
};

export const DEFAULT_LOCAL_ARTIST_PROFILE: LocalArtistProfile = {
  artistName: "",
  avatarImageUrl: null,
  heroImageUrl: null,
  links: [],
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

function normalizeProfileLinkPlatform(value: unknown): ProfileLinkPlatform | null {
  if (typeof value !== "string") return null;
  if ((PROFILE_LINK_PLATFORMS as readonly string[]).includes(value)) {
    return value as ProfileLinkPlatform;
  }
  return null;
}

function normalizeProfileLinks(value: unknown): ProfileLink[] {
  if (!Array.isArray(value)) return [];

  const unique = new Map<ProfileLinkPlatform, ProfileLink>();
  value.forEach((entry, index) => {
    if (!entry || typeof entry !== "object") return;
    const input = entry as Record<string, unknown>;
    const platform = normalizeProfileLinkPlatform(input.platform);
    if (!platform) return;
    const url = typeof input.url === "string" ? input.url.trim() : "";
    if (!url) return;
    const sortOrder =
      typeof input.sortOrder === "number" && Number.isFinite(input.sortOrder)
        ? input.sortOrder
        : index;
    unique.set(platform, { platform, url, sortOrder });
  });

  return Array.from(unique.values()).sort((a, b) => a.sortOrder - b.sortOrder);
}

function normalizeArtistProfile(value: unknown): LocalArtistProfile {
  if (!value || typeof value !== "object") {
    return DEFAULT_LOCAL_ARTIST_PROFILE;
  }

  const input = value as Record<string, unknown>;
  return {
    artistName: typeof input.artistName === "string" ? input.artistName.trim() : "",
    avatarImageUrl:
      typeof input.avatarImageUrl === "string" && input.avatarImageUrl.trim()
        ? input.avatarImageUrl.trim()
        : null,
    heroImageUrl:
      typeof input.heroImageUrl === "string" && input.heroImageUrl.trim()
        ? input.heroImageUrl.trim()
        : null,
    links: normalizeProfileLinks(input.links),
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

export async function getLocalArtistProfile(): Promise<LocalArtistProfile> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_ARTIST_PROFILE_KEY);
    if (!raw) return DEFAULT_LOCAL_ARTIST_PROFILE;
    return normalizeArtistProfile(JSON.parse(raw));
  } catch (error) {
    console.warn("Failed to read local artist profile:", error);
    return DEFAULT_LOCAL_ARTIST_PROFILE;
  }
}

export async function setLocalArtistProfile(
  updates: Partial<LocalArtistProfile>
): Promise<LocalArtistProfile> {
  const current = await getLocalArtistProfile();
  const next = normalizeArtistProfile({
    ...current,
    ...updates,
    links: updates.links ?? current.links,
  });

  try {
    await AsyncStorage.setItem(LOCAL_ARTIST_PROFILE_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn("Failed to save local artist profile:", error);
  }

  return next;
}
