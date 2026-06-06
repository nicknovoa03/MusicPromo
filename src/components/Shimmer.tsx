import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

interface ShimmerProps {
  style?: StyleProp<ViewStyle>;
  baseColor: string;
  highlightColor?: string;
}

export function Shimmer({ style, baseColor, highlightColor }: ShimmerProps) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.85,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View style={[style, { backgroundColor: baseColor, overflow: "hidden" }]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: highlightColor ?? baseColor,
            opacity,
          },
        ]}
      />
    </View>
  );
}
