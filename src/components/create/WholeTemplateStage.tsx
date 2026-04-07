import { useMemo } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { radius } from "@/constants/tokens";
import { CircularMediaPreview } from "@/components/create/CircularMediaPreview";
import { BetaWatermark } from "@/components/create/BetaWatermark";
import type { TemplateStageProps } from "@/lib/templates";
import {
  GRAPHIC_POP_STAGE_BACKGROUND_HEX,
  getGraphicPopTemplateLayout,
} from "@/lib/graphicPopTemplateSpec";

const MAX_BACKGROUND_BLUR = 24;
const MIN_RECORD_SIZE = 0.75;
const MAX_RECORD_SIZE = 1.3;

export function WholeTemplateStage({
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
  showWatermark,
}: TemplateStageProps) {
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
  const normalizedOpacity = Math.min(
    Math.max(1 - (templateTweaks?.recordTransparency ?? 0), 0.35),
    1,
  );
  const normalizedRecordSize = Math.min(
    Math.max(templateTweaks?.recordSize ?? 1, MIN_RECORD_SIZE),
    MAX_RECORD_SIZE,
  );
  const discSize = Math.max(
    96,
    Math.round(layout.discSize * normalizedRecordSize),
  );
  const discX = Math.round(layout.discX + (layout.discSize - discSize) / 2);
  const discY = Math.round(layout.discY + (layout.discSize - discSize) / 2);
  const hasBackgroundImage = Boolean(templateTweaks?.stageBackgroundImageUri);
  const shouldShowWatermark =
    showWatermark ?? templateTweaks?.showWatermark ?? true;
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
          backgroundColor:
            templateTweaks?.stageBackgroundColor ?? GRAPHIC_POP_STAGE_BACKGROUND_HEX,
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

      <View
        style={[
          styles.discWrap,
          {
            left: discX,
            top: discY,
          },
        ]}
      >
        <CircularMediaPreview
          imageUri={photoUri ?? null}
          size={discSize}
          spinning={isPlaying}
          spinSpeed={templateTweaks?.spinSpeed ?? 1}
          opacity={normalizedOpacity}
          rotationStartDeg={normalizedRotationStartDeg}
          rotationDirection={normalizedRotationDirection}
        />
      </View>

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

      <BetaWatermark containerWidth={width} visible={shouldShowWatermark} aspectRatio={aspectRatio} />
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
});
