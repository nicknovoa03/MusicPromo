import { Text, StyleSheet, View } from "react-native";
import { BETA_WATERMARK_TEXT, isBetaWatermarkEnabled } from "@/lib/betaWatermark";

interface BetaWatermarkProps {
  containerWidth?: number;
  inset?: number;
}

export function BetaWatermark({
  containerWidth = 320,
  inset,
}: BetaWatermarkProps) {
  if (!isBetaWatermarkEnabled()) return null;

  const resolvedInset = inset ?? Math.max(8, Math.round(containerWidth * 0.042));
  const fontSize = Math.max(10, Math.min(14, Math.round(containerWidth * 0.036)));

  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.wrap, { right: resolvedInset, bottom: resolvedInset }]}
    >
      <Text style={[styles.text, { fontSize, lineHeight: fontSize + 2 }]}>
        {BETA_WATERMARK_TEXT}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    zIndex: 10,
  },
  text: {
    color: "rgba(255,255,255,0.76)",
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    includeFontPadding: false,
    letterSpacing: 0.1,
  },
});
