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

  const resolvedInset = inset ?? Math.max(4, Math.round(containerWidth * 0.03));
  const fontSize = Math.max(9, Math.min(13, Math.round(containerWidth * 0.033)));

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
    color: "rgba(255,255,255,0.56)",
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    includeFontPadding: false,
    letterSpacing: 0.1,
  },
});
