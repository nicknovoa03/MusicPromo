import { View, Text, Image, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

export interface ProfileLink {
  platform: string;
  url: string;
  sortOrder?: number;
}

export interface SpkCoverSlideProps {
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

export function SpkCoverSlide({
  width,
  height,
  photoUri,
  artistName,
  trackTitle,
  links = [],
}: SpkCoverSlideProps) {
  const pad = Math.round(width * 0.072);
  const visibleLinks = links.slice(0, 4);

  const titleFontSize = Math.min(Math.round(width * 0.11), 46);
  const iconSize = Math.round(width * 0.045);
  const iconCircle = Math.round(width * 0.1);

  return (
    <View style={[styles.container, { width, height, backgroundColor: "#000" }]}>
      {photoUri ? (
        <Image
          source={{ uri: photoUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.noPhotoBackground]} />
      )}
      {/* Base overlay */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.28)" }]} />
      {/* Bottom strengthener for text legibility */}
      <View style={[StyleSheet.absoluteFill, styles.bottomGradient]} />

      <View style={[styles.content, { padding: pad }]}>
        {/* Artist name — small caps label at top */}
        <Text style={styles.artistName} numberOfLines={2}>
          {(artistName || "Artist").toUpperCase()}
        </Text>

        {/* Track title + social icons at bottom */}
        <View style={styles.bottom}>
          <Text
            style={[styles.trackTitle, { fontSize: titleFontSize, lineHeight: titleFontSize * 0.92 }]}
            numberOfLines={3}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {trackTitle || "Track Title"}
          </Text>

          {visibleLinks.length > 0 ? (
            <View style={styles.socialRow}>
              {visibleLinks.map((link) => (
                <View
                  key={link.platform}
                  style={[
                    styles.socialIcon,
                    { width: iconCircle, height: iconCircle, borderRadius: iconCircle / 2 },
                  ]}
                >
                  <Ionicons name={platformIcon(link.platform)} size={iconSize} color="#FFFFFF" />
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
  bottomGradient: {
    top: "45%",
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  noPhotoBackground: {
    backgroundColor: "#0E1014",
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
  },
  artistName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 2,
  },
  bottom: {
    gap: 10,
  },
  trackTitle: {
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  socialRow: {
    flexDirection: "row",
    gap: 8,
    alignSelf: "flex-end",
  },
  socialIcon: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
});
