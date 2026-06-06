import type { ProfileLink, ProfileLinkPlatform } from "@/lib/localProfile";

export const SHARE_PLATFORM_LABELS: Record<ProfileLinkPlatform, string> = {
  spotify: "Spotify",
  soundcloud: "SoundCloud",
  "apple-music": "Apple Music",
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  x: "X",
  website: "Website",
};

export const SHARE_LINK_ICONS = {
  spotify: "musical-notes",
  soundcloud: "cloud",
  "apple-music": "musical-note",
  youtube: "logo-youtube",
  instagram: "logo-instagram",
  tiktok: "logo-tiktok",
  x: "logo-twitter",
  website: "globe-outline",
} as const;

const HANDLE_PLATFORMS = new Set<ProfileLinkPlatform>([
  "spotify",
  "soundcloud",
  "apple-music",
  "youtube",
  "instagram",
  "tiktok",
  "x",
]);

export function extractShareLinkHandle(
  platform: ProfileLinkPlatform,
  fullUrl: string,
): string {
  if (!HANDLE_PLATFORMS.has(platform)) return fullUrl;
  let s = fullUrl.replace(/^https?:\/\/(www\.)?/, "");
  const prefixes: Partial<Record<ProfileLinkPlatform, string>> = {
    spotify: "open.spotify.com/search/",
    "apple-music": "music.apple.com/search?term=",
    soundcloud: "soundcloud.com/",
    youtube: "youtube.com/",
    instagram: "instagram.com/",
    tiktok: "tiktok.com/@",
    x: "x.com/",
  };
  const prefix = prefixes[platform];
  if (prefix && s.startsWith(prefix)) {
    s = s.slice(prefix.length);
  } else if (platform === "x" && s.startsWith("twitter.com/")) {
    s = s.slice("twitter.com/".length);
  }
  return decodeURIComponent(s.replace(/^@/, "").split("/")[0].split("?")[0]);
}

export type ShareCardLink = Pick<ProfileLink, "platform" | "url">;
