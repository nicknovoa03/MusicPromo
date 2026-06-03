import { Platform, View, Text, StyleSheet, Image } from "react-native";
import type { FlyerAspectRatio } from "@/lib/flyerDraft";
import type { FlyerTemplateData } from "@/lib/flyerTemplates";
import {
  flyerSize,
  flyerScriptLineHeight,
  flyerStackedTitleLineHeight,
  isFlyerCompact,
} from "@/lib/flyerLayout";
import { FlyerGradientBackground } from "./FlyerGradientBackground";
import { FlyerWatermark } from "./FlyerWatermark";
import { FlyerEventSubtitle } from "./FlyerEventSubtitle";
import { FlyerLineupBlock } from "./FlyerLineupBlock";
import { flyerFontFamilies } from "@/lib/flyerFonts";

type HeatFlyerTemplateProps = {
  data: FlyerTemplateData;
  backgroundColors: string[];
  accentColor: string;
  photoUri?: string | null;
  aspectRatio?: FlyerAspectRatio;
  showWatermark?: boolean;
};

export function HeatFlyerTemplate({
  data,
  backgroundColors,
  accentColor,
  photoUri,
  aspectRatio = "9:16",
  showWatermark = true,
}: HeatFlyerTemplateProps) {
  const compact = isFlyerCompact(aspectRatio);
  const fs = (value: number) => flyerSize(value, aspectRatio);
  const titleSize = fs(compact ? 44 : 56);
  // Caveat reads smaller than Anton at the same pt size — keep closer to design (~38/72).
  const subtitleSize = Math.round(titleSize * 0.72);
  const titleOverlap = fs(compact ? 6 : 8);

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
      <View
        style={[
          styles.badge,
          {
            backgroundColor: accentColor,
            top: fs(14),
            paddingHorizontal: fs(12),
            paddingVertical: fs(6),
          },
        ]}
      >
        <Text style={[styles.badgeText, { fontSize: fs(9) }]}>{data.badge}</Text>
      </View>
      <View
        style={[
          styles.content,
          {
            padding: fs(compact ? 16 : 22),
          },
        ]}
      >
        <Text
          style={[
            styles.eyebrow,
            {
              color: accentColor,
              fontSize: fs(10),
            },
          ]}
        >
          {data.eyebrow}
        </Text>
        <View
          style={[
            styles.titleBlock,
            compact && styles.titleBlockCompact,
            { paddingTop: fs(Platform.OS === "ios" ? 8 : 0) },
          ]}
        >
          <View
            style={[
              styles.titleGroup,
              { paddingHorizontal: fs(compact ? 10 : 14) },
            ]}
          >
            <Text
              style={[
                styles.titleDisplay,
                {
                  fontFamily: flyerFontFamilies.display,
                  fontSize: titleSize,
                  lineHeight: flyerStackedTitleLineHeight(titleSize),
                  paddingTop: fs(Platform.OS === "ios" ? 4 : 0),
                },
              ]}
            >
              {data.title}
            </Text>
            <View
              style={[
                styles.scriptLineWrap,
                {
                  minHeight: Math.round(subtitleSize * 1.55),
                  marginTop: -titleOverlap,
                  paddingHorizontal: fs(4),
                },
              ]}
            >
              <Text
                style={[
                  styles.titleScript,
                  {
                    fontFamily: flyerFontFamilies.script,
                    fontSize: subtitleSize,
                    lineHeight: flyerScriptLineHeight(subtitleSize),
                  },
                ]}
              >
                {data.subtitle}
              </Text>
            </View>
          </View>
          <FlyerEventSubtitle
            text={data.eventSubtitle}
            color="#fff"
            aspectRatio={aspectRatio}
          />
          <Text
            style={[
              styles.tagline,
              {
                color: accentColor,
                fontSize: fs(11),
                marginTop: fs(compact ? 4 : 6),
              },
            ]}
          >
            {data.tagline}
          </Text>
          <FlyerLineupBlock
            lineup={data.lineup}
            accentColor={accentColor}
            templateId="heat"
            aspectRatio={aspectRatio}
          />
        </View>
        <Text
          style={[
            styles.footer,
            {
              borderTopColor: `${accentColor}4D`,
              fontSize: fs(9),
              paddingTop: fs(compact ? 8 : 12),
            },
          ]}
        >
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
    right: -4,
    transform: [{ rotate: "8deg" }],
    zIndex: 2,
  },
  badgeText: {
    fontWeight: "800",
    fontStyle: "italic",
    color: "#000",
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
  },
  eyebrow: {
    fontWeight: "700",
    letterSpacing: 3,
    textAlign: "center",
    flexShrink: 0,
  },
  titleBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 0,
    width: "100%",
  },
  titleBlockCompact: {
    flex: 0,
    flexGrow: 1,
    flexShrink: 1,
    justifyContent: "center",
  },
  titleGroup: {
    alignItems: "center",
    alignSelf: "stretch",
    zIndex: 2,
    flexShrink: 0,
    overflow: "visible",
  },
  scriptLineWrap: {
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "stretch",
    overflow: "visible",
  },
  titleDisplay: {
    letterSpacing: -1,
    color: "#fff",
    textAlign: "center",
    textTransform: "uppercase",
    alignSelf: "center",
  },
  titleScript: {
    color: "#fff",
    textAlign: "center",
    // Caveat italic overhangs the measured text box on the right.
    paddingHorizontal: 2,
  },
  tagline: {
    fontWeight: "500",
    letterSpacing: 1,
    textAlign: "center",
  },
  footer: {
    fontWeight: "600",
    letterSpacing: 1.2,
    textAlign: "center",
    color: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
});
