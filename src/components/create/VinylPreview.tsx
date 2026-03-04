import { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/tokens";
import {
  getVinylToneSpec,
  toRgba,
  type VinylToneId,
} from "@/lib/vinylTemplateSpec";

interface VinylPreviewProps {
  imageUri?: string | null;
  size: number;
  spinning?: boolean;
  tone?: VinylToneId;
}

const GROOVE_SCALES = [0.92, 0.84, 0.76, 0.68, 0.6, 0.52, 0.44];
const CD_RING_SCALES = [0.96, 0.82, 0.68, 0.54];
const CD_RING_COLORS = [
  "rgba(255,255,255,0.26)",
  "rgba(198,216,255,0.2)",
  "rgba(255,201,223,0.18)",
  "rgba(220,255,244,0.18)",
];
const SPIN_DURATION_MS = 4200;

export function VinylPreview({
  imageUri,
  size,
  spinning = true,
  tone = "simple-spin",
}: VinylPreviewProps) {
  const spinProgress = useRef(new Animated.Value(0)).current;
  const toneSpec = getVinylToneSpec(tone);
  const isCdStyleTone = toneSpec.id === "simple-spin";

  useEffect(() => {
    if (!spinning) {
      spinProgress.stopAnimation();
      return;
    }

    spinProgress.setValue(0);
    const loop = Animated.loop(
      Animated.timing(spinProgress, {
        toValue: 1,
        duration: SPIN_DURATION_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();

    return () => {
      loop.stop();
      spinProgress.stopAnimation();
    };
  }, [spinning, spinProgress]);

  const rotation = spinProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const labelSize = size * (isCdStyleTone ? 0.36 : 0.28);
  const holeSize = Math.max(size * (isCdStyleTone ? 0.13 : 0.05), 6);
  const iconSize = Math.max(size * 0.2, 32);

  return (
    <View
      style={[
        styles.shell,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: isCdStyleTone ? "#bfc8d6" : "#121212",
        },
      ]}
    >
      <Animated.View
        style={[
          styles.surface,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ rotate: rotation }],
            backgroundColor: isCdStyleTone ? "#ced7e4" : "#181818",
          },
        ]}
      >
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.artwork}
            resizeMode="cover"
            accessibilityLabel="Vinyl artwork"
          />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons
              name="image-outline"
              size={iconSize}
              color={colors.dark.textSecondary}
            />
          </View>
        )}

        <View
          style={[
            styles.darken,
            {
              backgroundColor: toRgba(
                toneSpec.shadeHexColor,
                toneSpec.shadeAlphaByte,
              ),
            },
          ]}
        />
        {toneSpec.showGroovesInPreview ? (
          <View style={styles.groovesLayer}>
            {GROOVE_SCALES.map((scale, index) => {
              const grooveSize = size * scale;
              return (
                <View
                  key={String(scale)}
                  style={[
                    styles.groove,
                    {
                      width: grooveSize,
                      height: grooveSize,
                      borderRadius: grooveSize / 2,
                      borderColor:
                        index % 2 === 0
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(0,0,0,0.22)",
                    },
                  ]}
                />
              );
            })}
          </View>
        ) : null}
        {isCdStyleTone ? (
          <View style={styles.cdRingsLayer}>
            {CD_RING_SCALES.map((scale, index) => {
              const ringSize = size * scale;
              return (
                <View
                  key={String(scale)}
                  style={[
                    styles.cdRing,
                    {
                      width: ringSize,
                      height: ringSize,
                      borderRadius: ringSize / 2,
                      borderColor: CD_RING_COLORS[index] ?? "rgba(255,255,255,0.16)",
                    },
                  ]}
                />
              );
            })}
          </View>
        ) : null}

        <View
          style={[
            styles.label,
            {
              width: labelSize,
              height: labelSize,
              borderRadius: labelSize / 2,
              backgroundColor: toRgba(
                toneSpec.labelHexColor,
                toneSpec.labelAlphaByte,
              ),
            },
          ]}
        />
        <View
          style={[
            styles.hole,
            {
              width: holeSize,
              height: holeSize,
              borderRadius: holeSize / 2,
              backgroundColor: toRgba(
                toneSpec.holeHexColor,
                toneSpec.holeAlphaByte,
              ),
            },
          ]}
        />
        {isCdStyleTone ? (
          <>
            <View style={styles.cdIridescentStripeA} />
            <View style={styles.cdIridescentStripeB} />
          </>
        ) : null}
        {toneSpec.showSheenInPreview ? <View style={styles.sheen} /> : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: "hidden",
    backgroundColor: "#121212",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 14,
  },
  surface: {
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#181818",
  },
  artwork: {
    ...StyleSheet.absoluteFillObject,
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#101012",
  },
  darken: {
    ...StyleSheet.absoluteFillObject,
  },
  groovesLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
  },
  cdRingsLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  cdRing: {
    position: "absolute",
    borderWidth: 1,
  },
  groove: {
    position: "absolute",
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    borderWidth: 0,
  },
  hole: {
    position: "absolute",
    borderWidth: 0,
  },
  sheen: {
    position: "absolute",
    width: "78%",
    height: "78%",
    borderRadius: 9999,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopColor: "rgba(255,255,255,0.09)",
    borderLeftColor: "rgba(255,255,255,0.06)",
    borderBottomWidth: 0,
    borderRightWidth: 0,
    transform: [{ rotate: "-18deg" }],
  },
  cdIridescentStripeA: {
    position: "absolute",
    width: "78%",
    height: "24%",
    top: "18%",
    left: "12%",
    borderRadius: 9999,
    backgroundColor: "rgba(176,226,255,0.16)",
    transform: [{ rotate: "-21deg" }],
  },
  cdIridescentStripeB: {
    position: "absolute",
    width: "72%",
    height: "22%",
    bottom: "16%",
    right: "10%",
    borderRadius: 9999,
    backgroundColor: "rgba(255,194,226,0.14)",
    transform: [{ rotate: "-24deg" }],
  },
});
