import { Image, StyleSheet, View } from "react-native";
import { isBetaWatermarkEnabled } from "@/lib/betaWatermark";

const LOGO = require("../../../assets/MusicPromo-Logo.png");

interface BetaWatermarkProps {
  containerWidth?: number;
  inset?: number;
  visible?: boolean;
}

export function BetaWatermark({
  containerWidth = 320,
  inset,
  visible = true,
}: BetaWatermarkProps) {
  if (!isBetaWatermarkEnabled()) return null;

  const resolvedInset = inset ?? Math.max(4, Math.round(containerWidth * 0.03));
  const size = Math.max(28, Math.min(48, Math.round(containerWidth * 0.13)));

  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.wrap, { right: resolvedInset, bottom: resolvedInset, opacity: visible ? 1 : 0 }]}
    >
      <Image
        source={LOGO}
        style={{ width: size, height: size, resizeMode: "contain" }}
        fadeDuration={0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    zIndex: 10,
  },
});
