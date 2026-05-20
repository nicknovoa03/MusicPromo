import { View, Text, StyleSheet, Image } from "react-native";
import type { FlyerTemplateData } from "@/lib/flyerTemplates";
import { FlyerGradientBackground } from "./FlyerGradientBackground";
import { FlyerWatermark } from "./FlyerWatermark";
import { flyerFontFamilies } from "@/lib/flyerFonts";

type IridescentFlyerTemplateProps = {
  data: FlyerTemplateData;
  backgroundColors: string[];
  photoUri?: string | null;
  showWatermark?: boolean;
};

export function IridescentFlyerTemplate({
  data,
  backgroundColors,
  photoUri,
  showWatermark = true,
}: IridescentFlyerTemplateProps) {
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
        <Text style={styles.presenter}>{data.presenter}</Text>
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { fontFamily: flyerFontFamilies.displayCondensed }]}>
            {data.titleA}
          </Text>
          <Text style={[styles.title, { fontFamily: flyerFontFamilies.displayCondensed }]}>
            {data.titleB}
          </Text>
          <Text style={styles.subtitle}>{data.iridescentSubtitle}</Text>
          <View style={styles.artistsPill}>
            <Text style={[styles.artists, { fontFamily: flyerFontFamilies.display }]}>
              {data.lineupActs.map((a) => a.name).join("  ×  ") || data.artists}
            </Text>
          </View>
          <Text style={styles.genres}>{data.genres}</Text>
        </View>
        <View style={styles.footer}>
          <View>
            <Text style={styles.age}>{data.age}</Text>
            <Text style={styles.meta}>{data.time}</Text>
            <Text style={styles.meta}>{data.date}</Text>
          </View>
          <Text style={styles.venue}>{data.venue}</Text>
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
    padding: 22,
    justifyContent: "space-between",
  },
  presenter: {
    textAlign: "center",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: "#000",
  },
  titleBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 52,
    fontWeight: "900",
    lineHeight: 46,
    letterSpacing: -0.5,
    color: "#000",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 12,
    color: "#000",
    textAlign: "center",
  },
  artistsPill: {
    marginTop: 20,
    borderWidth: 2,
    borderColor: "#000",
    borderRadius: 40,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  artists: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: "#000",
    textAlign: "center",
  },
  genres: {
    fontSize: 9,
    fontWeight: "600",
    marginTop: 10,
    letterSpacing: 0.5,
    color: "#000",
    textAlign: "center",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  age: {
    fontSize: 11,
    fontWeight: "800",
    color: "#000",
  },
  meta: {
    fontSize: 9,
    fontWeight: "600",
    color: "#000",
    lineHeight: 14,
  },
  venue: {
    fontSize: 9,
    fontWeight: "600",
    color: "#000",
    textAlign: "right",
    maxWidth: "50%",
  },
});
