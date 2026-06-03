import { View, Text, StyleSheet } from "react-native";
import { SpkSlidePhotoBackground } from "./SpkSlidePhotoBackground";

export interface SpkTrackDetailsSlideProps {
  width: number;
  height: number;
  trackTitle?: string | null;
  genre?: string | null;
  bpm?: string | null;
  releaseDate?: string | null;
  label?: string | null;
  collaborators?: string | null;
  themeColor?: string;
  backgroundImageUri?: string | null;
}

interface MetaField {
  key: string;
  value: string;
}

export function SpkTrackDetailsSlide({
  width,
  height,
  trackTitle,
  genre,
  bpm,
  releaseDate,
  label,
  collaborators,
  themeColor = "#0E1014",
  backgroundImageUri,
}: SpkTrackDetailsSlideProps) {
  const pad = Math.round(width * 0.072);
  const titleFontSize = Math.min(Math.round(width * 0.092), 42);

  const pairFields: MetaField[] = [
    genre ? { key: "Genre", value: genre } : null,
    bpm ? { key: "BPM", value: bpm } : null,
  ].filter(Boolean) as MetaField[];

  const stackFields: MetaField[] = [
    releaseDate ? { key: "Released", value: releaseDate } : null,
    label ? { key: "Label", value: label } : null,
    collaborators ? { key: "With", value: collaborators } : null,
  ].filter(Boolean) as MetaField[];

  const hasAnyMeta = pairFields.length > 0 || stackFields.length > 0;

  return (
    <SpkSlidePhotoBackground
      width={width}
      height={height}
      imageUri={backgroundImageUri}
      fallbackColor={themeColor}
      padding={pad}
      style={styles.container}
    >
      <Text style={styles.sectionLabel}>Track Details</Text>

      <View style={styles.body}>
        <Text
          style={[styles.title, { fontSize: titleFontSize, lineHeight: titleFontSize * 0.92 }]}
          numberOfLines={4}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {trackTitle || "Untitled"}
        </Text>

        {hasAnyMeta ? (
          <View style={styles.metaBlock}>
            {pairFields.length > 0 ? (
              <View style={styles.pairRow}>
                {pairFields.map((field) => (
                  <View key={field.key} style={styles.pairCell}>
                    <Text style={styles.metaKey}>{field.key.toUpperCase()}</Text>
                    <Text style={styles.metaValue}>{field.value}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {stackFields.map((field) => (
              <View key={field.key} style={styles.stackRow}>
                <Text style={styles.metaKey}>{field.key.toUpperCase()}</Text>
                <Text style={styles.metaValue} numberOfLines={2}>{field.value}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
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
    marginBottom: 4,
  },
  body: {
    flex: 1,
    justifyContent: "center",
    gap: 20,
  },
  title: {
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  metaBlock: {
    gap: 10,
  },
  pairRow: {
    flexDirection: "row",
    gap: 24,
  },
  pairCell: {
    gap: 3,
  },
  stackRow: {
    gap: 3,
  },
  metaKey: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.8,
    color: "rgba(255,255,255,0.38)",
  },
  metaValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255,255,255,0.85)",
    lineHeight: 18,
  },
});
