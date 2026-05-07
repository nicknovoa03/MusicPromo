import { View, Text, Image, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

export interface ProfileLink {
  platform: string;
  url: string;
  sortOrder?: number;
}

export interface EpkCoverSlideProps {
  width: number;
  height: number;
  photoUri?: string | null;
  artistName?: string | null;
  trackTitle?: string | null;
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

export function EpkCoverSlide({
  width,
  height,
  photoUri,
  artistName,
  trackTitle,
  links = [],
}: EpkCoverSlideProps) {
  const pad = Math.round(width * 0.072);
  const visibleLinks = links.slice(0, 4);

  return (
    <View style={[styles.container, { width, height, backgroundColor: "#111111" }]}>
      {photoUri ? (
        <Image
          source={{ uri: photoUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.noPhotoBackground]} />
      )}
      <View style={[StyleSheet.absoluteFill, photoUri ? styles.overlay : styles.overlayLight]} />

      <View style={[styles.content, { padding: pad }]}>
        <Text style={styles.artistName} numberOfLines={2}>
          {artistName || "Artist"}
        </Text>

        <View style={styles.bottom}>
          <Text style={styles.trackTitle} numberOfLines={2}>
            {trackTitle || "Track Title"}
          </Text>

          {visibleLinks.length > 0 ? (
            <View style={styles.socialRow}>
              {visibleLinks.map((link) => (
                <View key={link.platform} style={styles.socialIcon}>
                  <Ionicons
                    name={platformIcon(link.platform)}
                    size={Math.round(width * 0.045)}
                    color="#FFFFFF"
                  />
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  overlay: {
    backgroundColor: "rgba(0,0,0,0.52)",
  },
  overlayLight: {
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  noPhotoBackground: {
    backgroundColor: "#1A1A2E",
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
  },
  artistName: {
    fontSize: 30,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  bottom: {
    gap: 10,
  },
  trackTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
    lineHeight: 22,
  },
  socialRow: {
    flexDirection: "row",
    gap: 8,
  },
  socialIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
});
