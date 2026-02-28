import { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/tokens";

interface VinylPreviewProps {
  imageUri?: string | null;
  size: number;
  spinning?: boolean;
}

const GROOVE_SCALES = [0.92, 0.84, 0.76, 0.68, 0.6, 0.52, 0.44];
const SPIN_DURATION_MS = 4200;

export function VinylPreview({
  imageUri,
  size,
  spinning = true,
}: VinylPreviewProps) {
  const spinProgress = useRef(new Animated.Value(0)).current;

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

  const labelSize = size * 0.28;
  const holeSize = Math.max(size * 0.05, 6);
  const iconSize = Math.max(size * 0.2, 32);

  return (
    <View
      style={[
        styles.shell,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
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

        <View style={styles.darken} />
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

        <View
          style={[
            styles.label,
            {
              width: labelSize,
              height: labelSize,
              borderRadius: labelSize / 2,
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
            },
          ]}
        />
        <View style={styles.sheen} />
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
    backgroundColor: "rgba(8,8,10,0.56)",
  },
  groovesLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
  },
  groove: {
    position: "absolute",
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    backgroundColor: "#E8E2D5",
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.2)",
  },
  hole: {
    position: "absolute",
    backgroundColor: "#0B0B0D",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
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
});
