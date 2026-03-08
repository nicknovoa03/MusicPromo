import { useMemo } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { radius } from "@/constants/tokens";
import { VinylPreview } from "@/components/create/VinylPreview";
import type { TemplateStageProps } from "@/lib/templates";
import {
  getVinylCenterGeometry,
  toRgba,
  type VinylToneId,
} from "@/lib/vinylTemplateSpec";
import {
  GRAPHIC_POP_AMBIENT_GLOW_ALPHA_BYTE,
  GRAPHIC_POP_AMBIENT_GLOW_HEX,
  GRAPHIC_POP_GLOW_ALPHA_BYTE,
  GRAPHIC_POP_GLOW_HEX,
  GRAPHIC_POP_STAGE_BACKGROUND_HEX,
  getGraphicPopTemplateLayout,
} from "@/lib/graphicPopTemplateSpec";

const MAX_BACKGROUND_BLUR = 24;
const MIN_RECORD_SIZE = 0.75;
const MAX_RECORD_SIZE = 1.3;

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
  const vinylToneId: VinylToneId = "graphic-pop";
  const layout = getGraphicPopTemplateLayout({ width, height, aspectRatio });
  const normalizedBackgroundBlur = Math.min(
    Math.max(templateTweaks?.backgroundBlur ?? 0, 0),
    MAX_BACKGROUND_BLUR,
  );
  const normalizedRotationStartDeg = Math.min(
    Math.max(templateTweaks?.rotationStartDeg ?? 0, -180),
    180,
  );
  const normalizedRotationDirection =
    templateTweaks?.rotationDirection === "ccw" ? "ccw" : "cw";
  const normalizedRecordOpacity = Math.min(
    Math.max(1 - (templateTweaks?.recordTransparency ?? 0), 0.35),
    1,
  );
  const normalizedRecordSize = Math.min(
    Math.max(templateTweaks?.recordSize ?? 1, MIN_RECORD_SIZE),
    MAX_RECORD_SIZE,
  );
  const normalizedArtworkScale = Math.min(
    Math.max(templateTweaks?.artworkScale ?? 1, 1),
    5,
  );
  const stageBackgroundColor =
    templateTweaks?.stageBackgroundColor ?? GRAPHIC_POP_STAGE_BACKGROUND_HEX;
  const discSize = Math.max(
    96,
    Math.round(layout.discSize * normalizedRecordSize),
  );
  const centerGeometry = getVinylCenterGeometry(vinylToneId, discSize);
  const holeSize = centerGeometry.holeDiameter;
  const discX = Math.round(layout.discX + (layout.discSize - discSize) / 2);
  const discY = Math.round(layout.discY + (layout.discSize - discSize) / 2);
  const holeX = Math.round(discX + (discSize - holeSize) / 2);
  const holeY = Math.round(discY + (discSize - holeSize) / 2);
  const hasBackgroundImage = Boolean(templateTweaks?.stageBackgroundImageUri);
  const backgroundSource = useMemo(
    () =>
      templateTweaks?.stageBackgroundImageUri
        ? { uri: templateTweaks.stageBackgroundImageUri }
        : null,
    [templateTweaks?.stageBackgroundImageUri],
  );

  return (
    <View
      style={[
        styles.stage,
        {
          width,
          height,
          backgroundColor: stageBackgroundColor,
          borderWidth: hasBackgroundImage ? 0 : StyleSheet.hairlineWidth,
          borderColor: hasBackgroundImage ? "transparent" : "rgba(255,255,255,0.12)",
        },
      ]}
      accessibilityLabel={`${playbackLabel}. ${trackTitle}. ${subtitle}`}
    >
      {backgroundSource ? (
        <Image
          source={backgroundSource}
          style={styles.backgroundImage}
          blurRadius={Math.round(normalizedBackgroundBlur)}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : null}

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
            left: discX,
            top: discY,
          },
        ]}
      >
        <VinylPreview
          imageUri={photoUri ?? null}
          size={discSize}
          spinning={isPlaying}
          spinSpeed={templateTweaks?.spinSpeed ?? 1}
          discOpacity={normalizedRecordOpacity}
          artworkScale={normalizedArtworkScale}
          rotationStartDeg={normalizedRotationStartDeg}
          rotationDirection={normalizedRotationDirection}
          tone="graphic-pop"
          holeColor={stageBackgroundColor}
        />
      </View>
      {backgroundSource ? (
        <View
          pointerEvents="none"
          style={[
            styles.holeOverlay,
            {
              left: holeX,
              top: holeY,
              width: holeSize,
              height: holeSize,
              borderRadius: holeSize / 2,
            },
          ]}
        >
          <Image
            source={backgroundSource}
            style={[
              styles.holeOverlayImage,
              {
                width,
                height,
                left: -holeX,
                top: -holeY,
              },
            ]}
            blurRadius={Math.round(normalizedBackgroundBlur)}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        </View>
      ) : null}

      {onTogglePlay ? (
        <Pressable
          onPress={onTogglePlay}
          style={[
            styles.playTouch,
            {
              left: discX,
              top: discY,
              width: discSize,
              height: discSize,
              borderRadius: Math.round(discSize / 2),
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
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  discWrap: {
    position: "absolute",
  },
  playTouch: {
    position: "absolute",
    backgroundColor: "transparent",
  },
  holeOverlay: {
    position: "absolute",
    overflow: "hidden",
  },
  holeOverlayImage: {
    position: "absolute",
  },
});
