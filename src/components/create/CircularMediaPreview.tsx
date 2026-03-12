import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "@/constants/tokens";

interface CircularMediaPreviewProps {
  imageUri?: string | null;
  size: number;
  spinning?: boolean;
  spinSpeed?: number;
  opacity?: number;
  rotationStartDeg?: number;
  rotationDirection?: "cw" | "ccw";
}

const SPIN_DURATION_MS = 4200;

export function CircularMediaPreview({
  imageUri,
  size,
  spinning = true,
  spinSpeed = 1,
  opacity = 1,
  rotationStartDeg = 0,
  rotationDirection = "cw",
}: CircularMediaPreviewProps) {
  const spinProgress = useRef(new Animated.Value(0)).current;
  const normalizedSpinSpeed = Math.min(Math.max(spinSpeed, 0.25), 4);
  const normalizedOpacity = Math.min(Math.max(opacity, 0.35), 1);
  const normalizedRotationStartDeg = Math.max(
    -180,
    Math.min(rotationStartDeg, 180),
  );
  const rotationDelta = rotationDirection === "ccw" ? -360 : 360;
  const spinDurationMs = Math.max(
    Math.round(SPIN_DURATION_MS / normalizedSpinSpeed),
    400,
  );

  useEffect(() => {
    if (!spinning) {
      spinProgress.stopAnimation();
      spinProgress.setValue(0);
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
    outputRange: [
      `${normalizedRotationStartDeg}deg`,
      `${normalizedRotationStartDeg + rotationDelta}deg`,
    ],
  });
  const source = useMemo(() => (imageUri ? { uri: imageUri } : null), [imageUri]);

  return (
    <Animated.View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity: normalizedOpacity,
          transform: [{ rotate: rotation }],
        },
      ]}
    >
      {source ? (
        <Image source={source} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.placeholder}>
          <Ionicons
            name="image-outline"
            size={Math.max(Math.round(size * 0.24), 28)}
            color={colors.dark.textSecondary}
          />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  circle: {
    overflow: "hidden",
    backgroundColor: colors.dark.surface,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
});
