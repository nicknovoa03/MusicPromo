import { View, Text, StyleSheet } from "react-native";
import { SpkSlidePhotoBackground } from "./SpkSlidePhotoBackground";

export interface SpkVisionSlideProps {
  width: number;
  height: number;
  vision?: string | null;
  artistName?: string | null;
  themeColor?: string;
  backgroundImageUri?: string | null;
}

const OPEN_QUOTE = "“";
const CLOSE_QUOTE = "”";

export function SpkVisionSlide({
  width,
  height,
  vision,
  artistName,
  themeColor = "#0E1014",
  backgroundImageUri,
}: SpkVisionSlideProps) {
  const pad = Math.round(width * 0.072);
  const quoteFontSize = Math.round(width * 0.18);
  const visionFontSize = Math.min(Math.round(width * 0.058), 24);

  return (
    <SpkSlidePhotoBackground
      width={width}
      height={height}
      imageUri={backgroundImageUri}
      fallbackColor={themeColor}
      padding={pad}
      style={styles.container}
    >
      <Text style={styles.sectionLabel}>VISION</Text>

      <View style={styles.body}>
        <Text style={[styles.quote, { fontSize: quoteFontSize, lineHeight: quoteFontSize * 0.8 }]}>
          {OPEN_QUOTE}
        </Text>
        <Text
          style={[styles.visionText, { fontSize: visionFontSize, lineHeight: visionFontSize * 1.35 }]}
          numberOfLines={8}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {vision || ""}
        </Text>
        <Text style={[styles.quote, { fontSize: quoteFontSize, lineHeight: quoteFontSize * 0.8, textAlign: "right" }]}>
          {CLOSE_QUOTE}
        </Text>
      </View>

      <Text style={styles.attribution}>
        {"— "}{(artistName || "Artist").toUpperCase()}
      </Text>
    </SpkSlidePhotoBackground>
  );
}

const styles = StyleSheet.create({
  container: {
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
    gap: 2,
  },
  quote: {
    fontWeight: "900",
    color: "rgba(255,255,255,0.65)",
  },
  visionText: {
    fontWeight: "500",
    color: "#FFFFFF",
    letterSpacing: 0.1,
  },
  attribution: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.55)",
    textAlign: "right",
  },
});
