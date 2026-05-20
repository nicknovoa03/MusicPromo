import { Platform, View, Text, StyleSheet, Image } from "react-native";
import type { FlyerAspectRatio } from "@/lib/flyerDraft";
import type { FlyerTemplateData } from "@/lib/flyerTemplates";
import {
  flyerSize,
  flyerStackedTitleLineHeight,
  isFlyerCompact,
} from "@/lib/flyerLayout";
import { FlyerGradientBackground } from "./FlyerGradientBackground";
import { FlyerWatermark } from "./FlyerWatermark";
import { FlyerEventSubtitle } from "./FlyerEventSubtitle";
import { FlyerLineupBlock } from "./FlyerLineupBlock";
import { flyerFontFamilies } from "@/lib/flyerFonts";

type VintageFlyerTemplateProps = {
  data: FlyerTemplateData;
  backgroundColors: string[];
  photoUri?: string | null;
  aspectRatio?: FlyerAspectRatio;
  showWatermark?: boolean;
};

export function VintageFlyerTemplate({
  data,
  backgroundColors,
  photoUri,
  aspectRatio = "9:16",
  showWatermark = true,
}: VintageFlyerTemplateProps) {
  const compact = isFlyerCompact(aspectRatio);
  const fs = (value: number) => flyerSize(value, aspectRatio);
  const titleSize = fs(compact ? 44 : 64);
  const titleA = data.titleA ?? data.title;
  const titleB = data.titleB ?? "";

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
            styles.overline,
            {
              fontFamily: flyerFontFamilies.scriptVintage,
              fontSize: fs(compact ? 28 : 42),
            },
          ]}
        >
          {data.overline}
        </Text>
        <View
          style={[
            styles.titleBlock,
            compact && styles.titleBlockCompact,
            { paddingTop: fs(Platform.OS === "ios" ? 8 : 4) },
          ]}
        >
          <Text
            style={[
              styles.title,
              {
                fontFamily: flyerFontFamilies.display,
                fontSize: titleSize,
                lineHeight: flyerStackedTitleLineHeight(titleSize),
                paddingTop: fs(Platform.OS === "ios" ? 4 : 0),
              },
            ]}
          >
            {titleB ? `${titleA}\n${titleB}` : titleA}
          </Text>
          <FlyerEventSubtitle
            text={data.eventSubtitle}
            color="#1a0e08"
            aspectRatio={aspectRatio}
          />
          <FlyerLineupBlock
            lineup={data.lineup}
            accentColor="#1a0e08"
            textColor="#1a0e08"
            mutedColor="rgba(26,14,8,0.65)"
            templateId="vintage"
            aspectRatio={aspectRatio}
          />
          <Text
            style={[
              styles.subtitle,
              {
                fontSize: fs(9),
                marginTop: fs(compact ? 8 : 14),
              },
            ]}
          >
            {data.tagline.toUpperCase()}
          </Text>
        </View>
        <View style={styles.footer}>
          <Text style={[styles.footerText, { fontSize: fs(10) }]}>{data.date}</Text>
          <View style={styles.venueBlock}>
            <Text
              style={[
                styles.venueScript,
                {
                  fontSize: fs(compact ? 10 : 13),
                },
              ]}
            >
              {data.venue}
            </Text>
            {data.city ? (
              <Text
                style={[
                  styles.venueCity,
                  {
                    fontSize: fs(compact ? 9 : 11),
                    marginTop: fs(2),
                  },
                ]}
              >
                {data.city}
              </Text>
            ) : null}
          </View>
          <Text style={[styles.footerText, { fontSize: fs(10) }]}>{data.time}</Text>
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
    justifyContent: "space-between",
  },
  overline: {
    fontStyle: "italic",
    color: "#1a0e08",
    transform: [{ rotate: "-3deg" }],
    flexShrink: 0,
    textAlign: "center",
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
  title: {
    fontWeight: "900",
    letterSpacing: -1,
    color: "#1a0e08",
    textAlign: "center",
  },
  subtitle: {
    fontWeight: "600",
    letterSpacing: 1,
    color: "#1a0e08",
    flexShrink: 0,
    textAlign: "center",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    flexShrink: 0,
  },
  footerText: {
    fontWeight: "700",
    letterSpacing: 0.5,
    color: "#1a0e08",
  },
  venueBlock: {
    maxWidth: "40%",
    alignItems: "center",
  },
  venueScript: {
    fontStyle: "italic",
    color: "#1a0e08",
    textAlign: "center",
  },
  venueCity: {
    fontStyle: "italic",
    color: "#1a0e08",
    textAlign: "center",
    letterSpacing: 0.5,
  },
});
