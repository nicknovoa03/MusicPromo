import { View, Text, Image, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

const DEFAULT_AVATAR = require("../../../assets/defaults/MusicPromo-DefaultAvatar.jpg");
const DEFAULT_BANNER = require("../../../assets/branding/MusicPromo-Banner.png");

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

export interface ProfileLink {
  platform: string;
  url: string;
  sortOrder?: number;
}

export interface EpkBioSlideProps {
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

export function EpkBioSlide({
  width,
  height,
  artistName,
  avatarImageUrl,
  heroImageUrl,
  bio,
  links = [],
}: EpkBioSlideProps) {
  const pad = Math.round(width * 0.072);
  const bannerHeight = Math.round(width * 0.32);
  const avatarSize = Math.round(width * 0.19);
  const avatarBorderWidth = 3;
  const avatarTop = bannerHeight - avatarSize / 2;

  const avatarSource = avatarImageUrl
    ? { uri: avatarImageUrl }
    : DEFAULT_AVATAR;

  const bannerSource = heroImageUrl
    ? { uri: heroImageUrl }
    : DEFAULT_BANNER;

  return (
    <View style={[styles.container, { width, height }]}>
      {/* Banner strip */}
      <View style={[styles.banner, { width, height: bannerHeight }]}>
        <Image source={bannerSource} style={{ width, height: bannerHeight }} resizeMode="cover" />
        <View style={[StyleSheet.absoluteFill, styles.bannerOverlay]} />
      </View>

      {/* Avatar — overlaps banner */}
      <View
        style={[
          styles.avatarWrapper,
          {
            top: avatarTop,
            left: pad,
            width: avatarSize + avatarBorderWidth * 2,
            height: avatarSize + avatarBorderWidth * 2,
            borderRadius: (avatarSize + avatarBorderWidth * 2) / 2,
            borderWidth: avatarBorderWidth,
          },
        ]}
      >
        <Image
          source={avatarSource}
          style={[
            styles.avatarImage,
            { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
          ]}
        />
      </View>

      {/* Body */}
      <View
        style={[
          styles.body,
          {
            paddingHorizontal: pad,
            paddingTop: avatarSize / 2 + 10,
            paddingBottom: pad,
          },
        ]}
      >
        <Text style={styles.artistName} numberOfLines={1}>
          {artistName || "Artist"}
        </Text>

        {bio ? (
          <Text style={styles.bio} numberOfLines={5}>
            {bio}
          </Text>
        ) : null}

        {links.length > 0 ? (
          <View style={styles.linksRow}>
            {links.map((link) => (
              <View key={link.platform} style={styles.linkIcon}>
                <Ionicons
                  name={platformIcon(link.platform)}
                  size={Math.round(width * 0.048)}
                  color="rgba(255,255,255,0.7)"
                />
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0A0A0A",
    overflow: "hidden",
  },
  banner: {
    overflow: "hidden",
  },
  bannerOverlay: {
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  avatarWrapper: {
    position: "absolute",
    backgroundColor: "#0A0A0A",
    overflow: "hidden",
  },
  avatarImage: {
    // size set inline
  },
  body: {
    flex: 1,
  },
  artistName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    fontWeight: "400",
    color: "rgba(255,255,255,0.72)",
    lineHeight: 20,
    flex: 1,
  },
  linksRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  linkIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
});
