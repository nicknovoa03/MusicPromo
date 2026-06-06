import { Image, StyleSheet, View } from "react-native";
import {
  resolveWatermarkInsetPx,
  resolveWatermarkLogoWidthPx,
} from "@/lib/betaWatermark";

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
  const resolvedInset = inset ?? resolveWatermarkInsetPx(containerWidth);
  const size = resolveWatermarkLogoWidthPx(containerWidth, {
    clampForSmallPreview: true,
  });

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
