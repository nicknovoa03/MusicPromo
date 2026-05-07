import { View, Text, StyleSheet } from "react-native";

export interface EpkTrackDetailsSlideProps {
  width: number;
  height: number;
  trackTitle?: string | null;
  templateName?: string | null;
  clipDurationSec?: number | null;
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${Math.round(sec)}s clip`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return s > 0 ? `${m}m ${s}s clip` : `${m}m clip`;
}

export function EpkTrackDetailsSlide({
  width,
  height,
  trackTitle,
  templateName,
  clipDurationSec,
}: EpkTrackDetailsSlideProps) {
  const pad = Math.round(width * 0.072);
  const hasMeta = Boolean(templateName || (clipDurationSec && clipDurationSec > 0));

  return (
    <View style={[styles.container, { width, height, padding: pad }]}>
      <Text style={styles.sectionLabel}>Track Details</Text>

      <View style={styles.body}>
        <Text
          style={[styles.title, { fontSize: Math.min(Math.round(width * 0.092), 42) }]}
          numberOfLines={4}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {trackTitle || "Untitled"}
        </Text>

        {hasMeta ? (
          <View style={styles.metaRow}>
            {templateName ? (
              <View style={styles.metaChip}>
                <Text style={styles.metaText}>{templateName}</Text>
              </View>
            ) : null}
            {clipDurationSec && clipDurationSec > 0 ? (
              <View style={styles.metaChip}>
                <Text style={styles.metaText}>{formatDuration(clipDurationSec)}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={styles.accent} />
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
    lineHeight: undefined,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  metaText: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255,255,255,0.6)",
  },
  accent: {
    height: 2,
    width: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 1,
  },
});
