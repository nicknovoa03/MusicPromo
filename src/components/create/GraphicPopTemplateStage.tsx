import { Pressable, StyleSheet, View } from "react-native";
import { radius } from "@/constants/tokens";
import { VinylPreview } from "@/components/create/VinylPreview";
import type { TemplateStageProps } from "@/lib/templates";
import {
  GRAPHIC_POP_AMBIENT_GLOW_ALPHA_BYTE,
  GRAPHIC_POP_AMBIENT_GLOW_HEX,
  GRAPHIC_POP_GLOW_ALPHA_BYTE,
  GRAPHIC_POP_GLOW_HEX,
  GRAPHIC_POP_STAGE_BACKGROUND_HEX,
  getGraphicPopTemplateLayout,
} from "@/lib/graphicPopTemplateSpec";
import { toRgba } from "@/lib/vinylTemplateSpec";

export function GraphicPopTemplateStage({
  width,
  height,
  aspectRatio,
  photoUri,
  isPlaying,
  playbackLabel,
  trackTitle,
  subtitle,
  templateTweaks,
  onTogglePlay,
}: TemplateStageProps) {
  const layout = getGraphicPopTemplateLayout({ width, height, aspectRatio });

  return (
    <View
      style={[
        styles.stage,
        {
          width,
          height,
          backgroundColor:
            templateTweaks?.stageBackgroundColor ?? GRAPHIC_POP_STAGE_BACKGROUND_HEX,
        },
      ]}
      accessibilityLabel={`${playbackLabel}. ${trackTitle}. ${subtitle}`}
    >
      {GRAPHIC_POP_AMBIENT_GLOW_ALPHA_BYTE > 0 ? (
        <View
          style={[
            styles.ambientGlow,
            {
              left: layout.ambientGlowX,
              top: layout.ambientGlowY,
              width: layout.ambientGlowSize,
              height: layout.ambientGlowSize,
              borderRadius: layout.ambientGlowRadius,
              backgroundColor: toRgba(
                GRAPHIC_POP_AMBIENT_GLOW_HEX,
                GRAPHIC_POP_AMBIENT_GLOW_ALPHA_BYTE,
              ),
            },
          ]}
        />
      ) : null}

      {GRAPHIC_POP_GLOW_ALPHA_BYTE > 0 ? (
        <View
          style={[
            styles.glow,
            {
              left: layout.glowX,
              top: layout.glowY,
              width: layout.glowSize,
              height: layout.glowSize,
              borderRadius: layout.glowRadius,
              backgroundColor: toRgba(
                GRAPHIC_POP_GLOW_HEX,
                GRAPHIC_POP_GLOW_ALPHA_BYTE,
              ),
            },
          ]}
        />
      ) : null}

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
          spinSpeed={templateTweaks?.spinSpeed ?? 1}
          discOpacity={templateTweaks?.recordOpacity ?? 1}
          tone="graphic-pop"
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
  ambientGlow: {
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
