import { View, Text, Image, StyleSheet } from "react-native";

export interface SpkCoverSlideProps {
  width: number;
  height: number;
  /** Cover background — defaults to track artwork when omitted. */
  photoUri?: string | null;
  trackTitle?: string | null;
}

export function SpkCoverSlide({
  width,
  height,
  photoUri,
  trackTitle,
}: SpkCoverSlideProps) {
  const pad = Math.round(width * 0.072);
  const titleFontSize = Math.min(Math.round(width * 0.11), 46);

  return (
    <View style={[styles.container, { width, height, backgroundColor: "#000" }]}>
      {photoUri ? (
        <Image
          source={{ uri: photoUri }}
          style={[StyleSheet.absoluteFill, styles.coverImage]}
          resizeMode="cover"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.noPhotoBackground]} />
      )}
      {/* Base overlay — light tint so artwork stays vivid */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.15)" }]} />
      {/* Simulated bottom gradient — three stepped layers to avoid a hard solid block */}
      <View style={[StyleSheet.absoluteFill, styles.gradientStep1]} />
      <View style={[StyleSheet.absoluteFill, styles.gradientStep2]} />
      <View style={[StyleSheet.absoluteFill, styles.gradientStep3]} />

      <View style={[styles.content, { padding: pad }]}>
        <Text
          style={[styles.trackTitle, { fontSize: titleFontSize, lineHeight: titleFontSize * 0.92 }]}
          numberOfLines={3}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {trackTitle || "Track Title"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  /** Slight overscan avoids a 1px uncovered edge in view-shot JPEG exports. */
  coverImage: {
    transform: [{ scale: 1.02 }],
  },
  gradientStep1: {
    top: "50%",
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  gradientStep2: {
    top: "65%",
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  gradientStep3: {
    top: "78%",
    backgroundColor: "rgba(0,0,0,0.22)",
  },
  noPhotoBackground: {
    backgroundColor: "#0E1014",
  },
  content: {
    flex: 1,
    justifyContent: "flex-end",
  },
  trackTitle: {
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -1,
  },
});
