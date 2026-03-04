import { Pressable, StyleSheet, View } from "react-native";
import { radius } from "@/constants/tokens";
import { VinylPreview } from "@/components/create/VinylPreview";
import type { TemplateStageProps } from "@/lib/templates";
import {
  getSimpleSpinTemplateLayout,
  SIMPLE_SPIN_GLOW_ALPHA_BYTE,
  SIMPLE_SPIN_GLOW_HEX,
  SIMPLE_SPIN_STAGE_BACKGROUND_HEX,
} from "@/lib/simpleSpinTemplateSpec";
import { toRgba } from "@/lib/vinylTemplateSpec";

export function SimpleSpinTemplateStage({
  width,
  height,
  aspectRatio,
  photoUri,
  isPlaying,
  playbackLabel,
  trackTitle,
  subtitle,
  onTogglePlay,
}: TemplateStageProps) {
  const layout = getSimpleSpinTemplateLayout({ width, height, aspectRatio });

  return (
    <View
      style={[
        styles.stage,
        {
          width,
          height,
          backgroundColor: SIMPLE_SPIN_STAGE_BACKGROUND_HEX,
        },
      ]}
      accessibilityLabel={`${playbackLabel}. ${trackTitle}. ${subtitle}`}
    >
      <View
        style={[
          styles.glow,
          {
            left: layout.glowX,
            top: layout.glowY,
            width: layout.glowSize,
            height: layout.glowSize,
            borderRadius: layout.glowRadius,
            backgroundColor: toRgba(SIMPLE_SPIN_GLOW_HEX, SIMPLE_SPIN_GLOW_ALPHA_BYTE),
          },
        ]}
      />

      <View
        style={[
          styles.discWrap,
          {
            left: layout.discX,
            top: layout.discY,
          },
        ]}
      >
        <VinylPreview
          imageUri={photoUri ?? null}
          size={layout.discSize}
          spinning={isPlaying}
          tone="simple-spin"
        />
      </View>

      {onTogglePlay ? (
        <Pressable
          onPress={onTogglePlay}
          style={[
            styles.playTouch,
            {
              left: layout.discX,
              top: layout.discY,
              width: layout.discSize,
              height: layout.discSize,
              borderRadius: layout.discRadius,
            },
          ]}
          accessibilityLabel={isPlaying ? "Pause preview" : "Play preview"}
          accessibilityRole="button"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 14,
  },
  glow: {
    position: "absolute",
  },
  discWrap: {
    position: "absolute",
  },
  playTouch: {
    position: "absolute",
    backgroundColor: "transparent",
  },
});
