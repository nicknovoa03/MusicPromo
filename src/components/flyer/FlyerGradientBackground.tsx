import { StyleSheet, View, Platform } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

type FlyerGradientBackgroundProps = {
  colors: string[];
};

function cssGradient(colors: string[]): string {
  const stops = colors.length >= 2 ? colors : [colors[0] ?? "#000", colors[0] ?? "#000"];
  const points = stops.map((color, index) => {
    const pct = stops.length === 1 ? 0 : (index / (stops.length - 1)) * 100;
    return `${color} ${pct}%`;
  });
  return `linear-gradient(135deg, ${points.join(", ")})`;
}

export function FlyerGradientBackground({ colors }: FlyerGradientBackgroundProps) {
  const stops = colors.length >= 2 ? colors : [colors[0] ?? "#000", colors[0] ?? "#000"];

  if (Platform.OS === "web") {
    return (
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundImage: cssGradient(stops) } as object,
        ]}
      />
    );
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="flyerBg" x1="0%" y1="0%" x2="100%" y2="100%">
            {stops.map((color, index) => (
              <Stop
                key={`${color}-${index}`}
                offset={`${(index / (stops.length - 1)) * 100}%`}
                stopColor={color}
              />
            ))}
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#flyerBg)" />
      </Svg>
    </View>
  );
}
