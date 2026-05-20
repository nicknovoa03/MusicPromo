import { View, Text, StyleSheet, Image } from "react-native";
import type { FlyerTemplateData } from "@/lib/flyerTemplates";
import { FlyerGradientBackground } from "./FlyerGradientBackground";
import { FlyerWatermark } from "./FlyerWatermark";
import { FlyerLineupBlock } from "./FlyerLineupBlock";
import { flyerFontFamilies } from "@/lib/flyerFonts";

type VintageFlyerTemplateProps = {
  data: FlyerTemplateData;
  backgroundColors: string[];
  photoUri?: string | null;
  showWatermark?: boolean;
};

export function VintageFlyerTemplate({
  data,
  backgroundColors,
  photoUri,
  showWatermark = true,
}: VintageFlyerTemplateProps) {
  const titleParts = data.title.split(/\s+/);
  const titleA = titleParts[0]?.toUpperCase() ?? "NIGHT";
  const titleB = titleParts.slice(1).join(" ").toUpperCase() || "FEVER";

  return (
    <View style={styles.root}>
      {photoUri ? (
        <>
          <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <View style={styles.photoOverlay} />
        </>
      ) : (
        <FlyerGradientBackground colors={backgroundColors} />
      )}
      <View style={styles.content}>
        <Text style={[styles.overline, { fontFamily: flyerFontFamilies.scriptVintage }]}>
          {data.overline}
        </Text>
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { fontFamily: flyerFontFamilies.display }]}>
            {titleA}
          </Text>
          <Text style={[styles.title, styles.titleSecond, { fontFamily: flyerFontFamilies.display }]}>
            {titleB}
          </Text>
          <FlyerLineupBlock
            lineup={data.lineup}
            accentColor="#1a0e08"
            textColor="#1a0e08"
            mutedColor="rgba(26,14,8,0.65)"
            templateId="vintage"
          />
          <Text style={styles.subtitle}>{data.tagline.toUpperCase()}</Text>
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>{data.date}</Text>
          <Text style={styles.venueScript}>{data.venue}</Text>
          <Text style={styles.footerText}>{data.time}</Text>
        </View>
      </View>
      {showWatermark ? <FlyerWatermark dark={false} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#6a7560",
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,160,80,0.25)",
  },
  content: {
    flex: 1,
    padding: 22,
  },
  overline: {
    fontSize: 42,
    fontStyle: "italic",
    color: "#1a0e08",
    marginTop: 12,
    marginLeft: 12,
    transform: [{ rotate: "-3deg" }],
  },
  titleBlock: {
    flex: 1,
    marginTop: -8,
  },
  title: {
    fontSize: 64,
    fontWeight: "900",
    lineHeight: 54,
    letterSpacing: -1,
    color: "#1a0e08",
  },
  titleSecond: {
    marginTop: -10,
  },
  djPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: "#1a0e08",
    borderRadius: 40,
    backgroundColor: "rgba(255,240,220,0.2)",
  },
  djLabel: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: "#1a0e08",
  },
  djName: {
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 14,
    color: "#1a0e08",
  },
  subtitle: {
    fontSize: 9,
    fontWeight: "600",
    marginTop: 14,
    letterSpacing: 1,
    color: "#1a0e08",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  footerText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: "#1a0e08",
  },
  venueScript: {
    fontSize: 18,
    fontStyle: "italic",
    color: "#1a0e08",
    maxWidth: "40%",
    textAlign: "center",
  },
});
