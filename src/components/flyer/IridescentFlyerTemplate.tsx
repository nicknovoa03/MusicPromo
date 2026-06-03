import { View, Text, StyleSheet, Image } from "react-native";
import type { FlyerAspectRatio } from "@/lib/flyerDraft";
import type { FlyerTemplateData } from "@/lib/flyerTemplates";
import { flyerSize, flyerTitleLineHeight, isFlyerCompact } from "@/lib/flyerLayout";
import { FlyerGradientBackground } from "./FlyerGradientBackground";
import { FlyerWatermark } from "./FlyerWatermark";
import { FlyerEventSubtitle } from "./FlyerEventSubtitle";
import { FlyerLineupBlock } from "./FlyerLineupBlock";
import { flyerFontFamilies } from "@/lib/flyerFonts";

type IridescentFlyerTemplateProps = {
  data: FlyerTemplateData;
  backgroundColors: string[];
  photoUri?: string | null;
  aspectRatio?: FlyerAspectRatio;
  showWatermark?: boolean;
};

export function IridescentFlyerTemplate({
  data,
  backgroundColors,
  photoUri,
  aspectRatio = "9:16",
  showWatermark = true,
}: IridescentFlyerTemplateProps) {
  const compact = isFlyerCompact(aspectRatio);
  const fs = (value: number) => flyerSize(value, aspectRatio);
  const titleSize = fs(compact ? 38 : 52);

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
        <Text style={[styles.presenter, { fontSize: fs(9) }]}>{data.presenter}</Text>
        <View style={[styles.titleBlock, compact && styles.titleBlockCompact]}>
          <Text
            style={[
              styles.title,
              {
                fontFamily: flyerFontFamilies.displayCondensed,
                fontSize: titleSize,
                lineHeight: flyerTitleLineHeight(titleSize),
              },
            ]}
          >
            {data.titleA}
          </Text>
          <Text
            style={[
              styles.title,
              {
                fontFamily: flyerFontFamilies.displayCondensed,
                fontSize: titleSize,
                lineHeight: flyerTitleLineHeight(titleSize),
              },
            ]}
          >
            {data.titleB}
          </Text>
          <FlyerEventSubtitle
            text={data.eventSubtitle}
            color="#000"
            aspectRatio={aspectRatio}
          />
          <FlyerLineupBlock
            lineup={data.lineup}
            accentColor="#000"
            textColor="#000"
            mutedColor="rgba(0,0,0,0.65)"
            templateId="iridescent"
            aspectRatio={aspectRatio}
          />
          <Text
            style={[
              styles.genres,
              {
                fontSize: fs(9),
                marginTop: fs(compact ? 6 : 10),
              },
            ]}
          >
            {data.genres}
          </Text>
        </View>
        <View style={styles.footer}>
          <View>
            <Text style={[styles.age, { fontSize: fs(11) }]}>{data.age}</Text>
            <Text style={[styles.meta, { fontSize: fs(9), lineHeight: fs(14) }]}>
              {data.time}
            </Text>
            <Text style={[styles.meta, { fontSize: fs(9), lineHeight: fs(14) }]}>
              {data.date}
            </Text>
          </View>
          <Text style={[styles.venue, { fontSize: fs(9) }]}>{data.venue}</Text>
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
    backgroundColor: "#ffcce7",
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
  },
  presenter: {
    textAlign: "center",
    fontWeight: "700",
    letterSpacing: 1.5,
    color: "#000",
    flexShrink: 0,
  },
  titleBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 0,
  },
  titleBlockCompact: {
    flex: 0,
    flexGrow: 1,
    flexShrink: 1,
    justifyContent: "center",
  },
  title: {
    fontWeight: "900",
    letterSpacing: -0.5,
    color: "#000",
    textAlign: "center",
  },
  genres: {
    fontWeight: "600",
    letterSpacing: 0.5,
    color: "#000",
    textAlign: "center",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    flexShrink: 0,
  },
  age: {
    fontWeight: "800",
    color: "#000",
  },
  meta: {
    fontWeight: "600",
    color: "#000",
  },
  venue: {
    fontWeight: "600",
    color: "#000",
    textAlign: "right",
    maxWidth: "50%",
  },
});
