import { View, Text, Image, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

const DEFAULT_AVATAR = require("../../../assets/defaults/MusicPromo-DefaultAvatar.jpg");

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

export interface ProfileLink {
  platform: string;
  url: string;
  sortOrder?: number;
}

export interface SpkBioSlideProps {
  width: number;
  height: number;
  artistName?: string | null;
  avatarImageUrl?: string | null;
  heroImageUrl?: string | null;
  bio?: string | null;
  links?: ProfileLink[];
}

function platformIcon(platform: string): IoniconName {
  const map: Record<string, IoniconName> = {
    youtube: "logo-youtube",
    instagram: "logo-instagram",
    x: "logo-twitter",
    website: "globe-outline",
    soundcloud: "cloud-outline",
    spotify: "musical-notes-outline",
    "apple-music": "musical-note-outline",
    tiktok: "musical-notes-outline",
  };
  return map[platform] ?? "link-outline";
}

const BIO_MAX_CHARS = 140;

export function SpkBioSlide({
  width,
  height,
  artistName,
  avatarImageUrl,
  bio,
  links = [],
}: SpkBioSlideProps) {
  const pad = Math.round(width * 0.072);
  const avatarSize = Math.round(width * 0.19);
  const iconCircle = Math.round(width * 0.1);
  const iconSize = Math.round(width * 0.048);

  const avatarSource = avatarImageUrl ? { uri: avatarImageUrl } : DEFAULT_AVATAR;

  const bioText = bio
    ? bio.length > BIO_MAX_CHARS
      ? bio.slice(0, BIO_MAX_CHARS).trimEnd() + "…"
      : bio
    : null;

  return (
    <View style={[styles.container, { width, height, padding: pad }]}>
      {/* Top: avatar + artist name inline */}
      <View style={[styles.header, { marginBottom: pad * 0.75 }]}>
        <Image
          source={avatarSource}
          style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
        />
        <Text style={styles.artistName} numberOfLines={2}>
          {artistName || "Artist"}
        </Text>
      </View>

      {/* Bio */}
      {bioText ? (
        <Text style={styles.bio}>{bioText}</Text>
      ) : null}

      {/* Social icons pinned to bottom */}
      <View style={styles.spacer} />
      {links.length > 0 ? (
        <View style={styles.linksRow}>
          {links.map((link) => (
            <View
              key={link.platform}
              style={[
                styles.linkIcon,
                { width: iconCircle, height: iconCircle, borderRadius: iconCircle / 2 },
              ]}
            >
              <Ionicons
                name={platformIcon(link.platform)}
                size={iconSize}
                color="rgba(255,255,255,0.7)"
              />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0E1014",
    overflow: "hidden",
    flexDirection: "column",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    flexShrink: 0,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  artistName: {
    flex: 1,
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  bio: {
    fontSize: 14,
    fontWeight: "400",
    color: "rgba(255,255,255,0.72)",
    lineHeight: 20,
  },
  spacer: {
    flex: 1,
  },
  linksRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  linkIcon: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
});
