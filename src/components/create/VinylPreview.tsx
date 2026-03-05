import { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/tokens";
import {
  getVinylToneSpec,
  toRgba,
  type VinylToneId,
} from "@/lib/vinylTemplateSpec";
import {
  GRAPHIC_POP_CENTER_RING_ALPHA_BYTE,
  GRAPHIC_POP_CENTER_RING_HEX,
  GRAPHIC_POP_CENTER_SHADOW_ALPHA_BYTE,
  GRAPHIC_POP_CENTER_SHADOW_HEX,
} from "@/lib/graphicPopTemplateSpec";
import { getCenterTextureSpec } from "@/lib/simpleSpinTemplateSpec";

interface VinylPreviewProps {
  imageUri?: string | null;
  size: number;
  spinning?: boolean;
  tone?: VinylToneId;
  spinSpeed?: number;
  discOpacity?: number;
}

const GROOVE_SCALES = [0.95, 0.89, 0.83, 0.77, 0.71, 0.65, 0.59, 0.53, 0.47];
const CD_RING_SCALES = [0.93, 0.78, 0.62, 0.46];
const CD_RING_COLORS = [
  "rgba(255,255,255,0.3)",
  "rgba(188,214,255,0.24)",
  "rgba(255,201,223,0.2)",
  "rgba(220,255,244,0.2)",
];
const SPIN_DURATION_MS = 4200;

export function VinylPreview({
  imageUri,
  size,
  spinning = true,
  tone = "simple-spin",
  spinSpeed = 1,
  discOpacity = 1,
}: VinylPreviewProps) {
  const spinProgress = useRef(new Animated.Value(0)).current;
  const toneSpec = getVinylToneSpec(tone);
  const isCdStyleTone = toneSpec.id === "simple-spin";
  const isGraphicTone = toneSpec.id === "graphic-pop";
  const normalizedSpinSpeed = Math.min(Math.max(spinSpeed, 0.25), 4);
  const spinDurationMs = Math.max(
    Math.round(SPIN_DURATION_MS / normalizedSpinSpeed),
    400,
  );
  const normalizedDiscOpacity = Math.min(Math.max(discOpacity, 0.35), 1);

  useEffect(() => {
    if (!spinning) {
      spinProgress.stopAnimation();
      return;
    }

    spinProgress.setValue(0);
    const loop = Animated.loop(
      Animated.timing(spinProgress, {
        toValue: 1,
        duration: spinDurationMs,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();

    return () => {
      loop.stop();
      spinProgress.stopAnimation();
    };
  }, [spinning, spinDurationMs, spinProgress]);

  const rotation = spinProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const labelSize = size * (isCdStyleTone ? 0.36 : isGraphicTone ? 0.19 : 0.28);
  const holeSize = Math.max(
    size * (isCdStyleTone ? 0.13 : isGraphicTone ? 0.068 : 0.05),
    6,
  );
  const spindleRingSize = Math.max(holeSize * (isGraphicTone ? 1.7 : 2.3), 14);
  const outerRimWidth = Math.max(size * 0.017, 1.2);
  const innerRimSize = size * 0.955;
  const centerTexture = getCenterTextureSpec(size);
  const graphicInnerRingSize = centerTexture.ringRadius * 2;
  const graphicInnerRingBorderWidth = centerTexture.ringThickness;
  const graphicInnerShadowSize = centerTexture.shadowOuterRadius * 2;
  const graphicInnerShadowOffsetX = centerTexture.shadowOffsetX;
  const graphicInnerShadowOffsetY = centerTexture.shadowOffsetY;
  const graphicCenterRingColor = toRgba(
    GRAPHIC_POP_CENTER_RING_HEX,
    GRAPHIC_POP_CENTER_RING_ALPHA_BYTE,
  );
  const graphicCenterShadowColor = toRgba(
    GRAPHIC_POP_CENTER_SHADOW_HEX,
    GRAPHIC_POP_CENTER_SHADOW_ALPHA_BYTE,
  );
  const iconSize = Math.max(size * 0.2, 32);

  return (
    <View
      style={[
        styles.shell,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: isGraphicTone
            ? "#1d222c"
            : isCdStyleTone
              ? "#bfc8d6"
              : "#121212",
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
            opacity: normalizedDiscOpacity,
            transform: [{ rotate: rotation }],
            backgroundColor: isGraphicTone
              ? "#d4d9e0"
              : isCdStyleTone
                ? "#ced7e4"
                : "#181818",
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
        <View
          style={[
            styles.outerRim,
            {
              borderRadius: size / 2,
              borderWidth: outerRimWidth,
            },
          ]}
        />
        <View
          style={[
            styles.innerRim,
            {
              width: innerRimSize,
              height: innerRimSize,
              borderRadius: innerRimSize / 2,
              top: (size - innerRimSize) / 2,
              left: (size - innerRimSize) / 2,
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
        {isGraphicTone ? (
          <>
            <View
              style={[
                styles.graphicInnerShadowRing,
                {
                  width: graphicInnerShadowSize,
                  height: graphicInnerShadowSize,
                  borderRadius: graphicInnerShadowSize / 2,
                  borderWidth: graphicInnerRingBorderWidth + 0.8,
                  top:
                    (size - graphicInnerShadowSize) / 2 + graphicInnerShadowOffsetY,
                  left:
                    (size - graphicInnerShadowSize) / 2 + graphicInnerShadowOffsetX,
                  borderColor: graphicCenterShadowColor,
                },
              ]}
            />
            <View
              style={[
                styles.graphicInnerRing,
                {
                  width: graphicInnerRingSize,
                  height: graphicInnerRingSize,
                  borderRadius: graphicInnerRingSize / 2,
                  borderWidth: graphicInnerRingBorderWidth,
                  top: (size - graphicInnerRingSize) / 2,
                  left: (size - graphicInnerRingSize) / 2,
                  borderColor: graphicCenterRingColor,
                },
              ]}
            />
          </>
        ) : null}
        {isGraphicTone ? null : (
          <View
            style={[
              styles.spindleRing,
              {
                width: spindleRingSize,
                height: spindleRingSize,
                borderRadius: spindleRingSize / 2,
              },
            ]}
          />
        )}
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
      {isGraphicTone ? null : (
        <>
          <View
            pointerEvents="none"
            style={[
              styles.staticSpecular,
              {
                width: size * 0.84,
                height: size * 0.32,
                borderRadius: size * 0.42,
                top: size * 0.11,
                left: size * 0.08,
              },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.staticEdgeShadow,
              {
                width: size * 0.88,
                height: size * 0.24,
                borderRadius: size * 0.44,
                bottom: size * 0.1,
                left: size * 0.06,
              },
            ]}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: "hidden",
    backgroundColor: "#121212",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.42,
    shadowRadius: 24,
    elevation: 16,
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
  outerRim: {
    ...StyleSheet.absoluteFillObject,
    borderColor: "rgba(10,14,22,0.38)",
  },
  innerRim: {
    position: "absolute",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
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
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },
  graphicInnerRing: {
    position: "absolute",
    backgroundColor: "transparent",
  },
  graphicInnerShadowRing: {
    position: "absolute",
    backgroundColor: "transparent",
  },
  spindleRing: {
    position: "absolute",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(14,17,27,0.3)",
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
  staticSpecular: {
    position: "absolute",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.04)",
    transform: [{ rotate: "-20deg" }],
  },
  staticEdgeShadow: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.13)",
    transform: [{ rotate: "14deg" }],
  },
});
