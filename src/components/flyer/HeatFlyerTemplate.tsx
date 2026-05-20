import { View, Text, StyleSheet, Image } from "react-native";
import type { FlyerTemplateData } from "@/lib/flyerTemplates";
import { FlyerGradientBackground } from "./FlyerGradientBackground";
import { FlyerWatermark } from "./FlyerWatermark";
import { FlyerLineupBlock } from "./FlyerLineupBlock";
import { flyerFontFamilies } from "@/lib/flyerFonts";

type HeatFlyerTemplateProps = {
  data: FlyerTemplateData;
  backgroundColors: string[];
  accentColor: string;
  photoUri?: string | null;
  showWatermark?: boolean;
};

export function HeatFlyerTemplate({
  data,
  backgroundColors,
  accentColor,
  photoUri,
  showWatermark = true,
}: HeatFlyerTemplateProps) {
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
      <View style={styles.halftone} pointerEvents="none" />
      <View style={[styles.badge, { backgroundColor: accentColor }]}>
        <Text style={styles.badgeText}>{data.badge}</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.center}>
          <Text style={[styles.eyebrow, { color: accentColor }]}>{data.eyebrow}</Text>
          <Text style={[styles.title, { fontFamily: flyerFontFamilies.display }]}>
            {data.title}
          </Text>
          <Text style={[styles.subtitle, { fontFamily: flyerFontFamilies.script }]}>
            {data.subtitle}
          </Text>
          <Text style={[styles.tagline, { color: accentColor }]}>{data.tagline}</Text>
          <FlyerLineupBlock
            lineup={data.lineup}
            accentColor={accentColor}
            templateId="heat"
          />
        </View>
        <Text style={[styles.footer, { borderTopColor: `${accentColor}4D` }]}>
          {data.footer}
        </Text>
      </View>
      {showWatermark ? <FlyerWatermark dark /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#1a0808",
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  halftone: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.15)",
    opacity: 0.35,
  },
  badge: {
    position: "absolute",
    top: 14,
    right: -4,
    transform: [{ rotate: "8deg" }],
    paddingHorizontal: 12,
    paddingVertical: 6,
    zIndex: 2,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "800",
    fontStyle: "italic",
    color: "#000",
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  center: {
    flex: 1,
    alignItems: "center",
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 3,
    marginBottom: 8,
  },
  title: {
    fontSize: 56,
    fontWeight: "400",
    lineHeight: 48,
    letterSpacing: -1,
    color: "#fff",
    textAlign: "center",
    textTransform: "uppercase",
  },
  subtitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    marginTop: -2,
    textAlign: "center",
  },
  tagline: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 4,
    letterSpacing: 1,
    textAlign: "center",
  },
  footer: {
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 1.2,
    textAlign: "center",
    color: "#fff",
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
