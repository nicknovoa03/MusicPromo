import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

type FlyerGradientBackgroundProps = {
  colors: string[];
};

export function FlyerGradientBackground({ colors }: FlyerGradientBackgroundProps) {
  const stops = colors.length >= 2 ? colors : [colors[0] ?? "#000", colors[0] ?? "#000"];
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
