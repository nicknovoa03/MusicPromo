import { View, Text, StyleSheet } from "react-native";

export interface SpkTrackDetailsSlideProps {
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

export function SpkTrackDetailsSlide({
  width,
  height,
  trackTitle,
  templateName,
  clipDurationSec,
}: SpkTrackDetailsSlideProps) {
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
          <Text style={styles.metaText}>
            {[templateName, clipDurationSec && clipDurationSec > 0 ? formatDuration(clipDurationSec) : null]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0E1014",
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
    gap: 12,
  },
  title: {
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -1,
    lineHeight: undefined,
  },
  metaText: {
    fontSize: 13,
    fontWeight: "400",
    color: "rgba(255,255,255,0.55)",
    lineHeight: 18,
  },
});
