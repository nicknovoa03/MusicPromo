import { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography } from "@/constants/tokens";
import type { RenderAspectRatio } from "@/lib/rendering/types";
import { spinningCdComposition } from "@/lib/rendering/templates/spinningCdComposition";

interface SpinningCdTemplatePreviewProps {
  photoUri?: string;
  aspectRatio: RenderAspectRatio;
  style?: StyleProp<ViewStyle>;
  showLabel?: boolean;
}

export function SpinningCdTemplatePreview({
  photoUri,
  aspectRatio,
  style,
  showLabel = false,
}: SpinningCdTemplatePreviewProps) {
  const spinProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spinProgress, {
        toValue: 1,
        duration: spinningCdComposition.spinDurationSec * 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    animation.start();
    return () => {
      animation.stop();
      spinProgress.setValue(0);
    };
  }, [spinProgress]);

  const rotation = useMemo(
    () =>
      spinProgress.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "360deg"],
      }),
    [spinProgress],
  );

  const previewAspect = aspectRatio === "1:1" ? 1 : 9 / 16;

  return (
    <View style={[styles.root, { aspectRatio: previewAspect }, style]}>
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={styles.backgroundImage} resizeMode="cover" />
      ) : (
        <View style={styles.placeholder}>
          <Ionicons
            name="image-outline"
            size={42}
            color={colors.dark.textSecondary}
            accessibilityLabel="Missing preview image"
          />
        </View>
      )}

      <View
        style={[
          styles.backgroundOverlay,
          { opacity: spinningCdComposition.backgroundDarkOverlayOpacity },
        ]}
      />

      <View
        style={[
          styles.discSizer,
          {
            width: `${spinningCdComposition.cdSizeRatio * 100}%`,
            aspectRatio: 1,
            borderRadius: 999,
          },
        ]}
      >
        <Animated.View style={[styles.discRotatingLayer, { transform: [{ rotate: rotation }] }]}>
          <View style={styles.discFrame}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.discImage} resizeMode="cover" />
            ) : (
              <View style={styles.discImageFallback} />
            )}
          </View>
          <View
            style={[
              styles.discCenterHole,
              {
                width: `${spinningCdComposition.centerHoleRatio * 100}%`,
                height: `${spinningCdComposition.centerHoleRatio * 100}%`,
                borderRadius: 999,
              },
            ]}
          />
        </Animated.View>
      </View>

      {showLabel ? <Text style={styles.label}>Spinning CD preview</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: 18,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.dark.surface,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.dark.surface,
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
  },
  discSizer: {
    alignItems: "center",
    justifyContent: "center",
  },
  discRotatingLayer: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  discFrame: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
  },
  discImage: {
    width: "100%",
    height: "100%",
  },
  discImageFallback: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  discCenterHole: {
    position: "absolute",
    backgroundColor: "#050505",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  label: {
    ...typography.caption,
    color: "rgba(255,255,255,0.6)",
    marginTop: spacing.md,
  },
});
