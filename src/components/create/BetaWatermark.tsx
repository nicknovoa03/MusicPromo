import { Image, StyleSheet, View } from "react-native";

const LOGO = require("../../../assets/branding/MusicPromo-Logo.png");

interface BetaWatermarkProps {
  containerWidth?: number;
  inset?: number;
  visible?: boolean;
  aspectRatio?: string;
}

export function BetaWatermark({
  containerWidth = 320,
  inset,
  visible = true,
  aspectRatio,
}: BetaWatermarkProps) {
  const resolvedInset = inset ?? Math.max(4, Math.round(containerWidth * 0.015));
  const size = Math.max(28, Math.min(48, Math.round(containerWidth * 0.13)));

  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.wrap, { bottom: resolvedInset, left: 0, right: 0, alignItems: "center", opacity: visible ? 1 : 0 }]}
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
