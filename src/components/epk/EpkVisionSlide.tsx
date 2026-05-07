import { View, Text, StyleSheet } from "react-native";

export interface EpkVisionSlideProps {
  width: number;
  height: number;
  vision?: string | null;
  artistName?: string | null;
}

export function EpkVisionSlide({
  width,
  height,
  vision,
  artistName,
}: EpkVisionSlideProps) {
  const pad = Math.round(width * 0.072);

  return (
    <View style={[styles.container, { width, height, padding: pad }]}>
      <Text style={styles.sectionLabel}>Vision</Text>

      <View style={styles.body}>
        <Text style={[styles.openQuote, { fontSize: Math.round(width * 0.2) }]}>
          {"“"}
        </Text>
        <Text
          style={[styles.visionText, { fontSize: Math.min(Math.round(width * 0.055), 22) }]}
          numberOfLines={8}
        >
          {vision || ""}
        </Text>
      </View>

      <Text style={styles.attribution}>
        {"—"} {artistName || "Artist"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0A0A0A",
    overflow: "hidden",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2.5,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.38)",
  },
  body: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  openQuote: {
    fontWeight: "900",
    color: "rgba(255,255,255,0.12)",
    lineHeight: undefined,
    marginBottom: -8,
  },
  visionText: {
    fontWeight: "500",
    color: "#FFFFFF",
    lineHeight: 30,
    letterSpacing: 0.1,
  },
  attribution: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255,255,255,0.4)",
    textAlign: "right",
  },
});
