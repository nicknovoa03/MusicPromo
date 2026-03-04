import { Pressable, StyleSheet, View } from "react-native";
import { radius } from "@/constants/tokens";
import { VinylPreview } from "@/components/create/VinylPreview";
import type { TemplateStageProps } from "@/lib/templates";

function even(value: number) {
  return value % 2 === 0 ? value : value - 1;
}

function getDiscSize(width: number, height: number, aspectRatio: "9:16" | "1:1") {
  const basis = Math.min(width, height);
  const scale = aspectRatio === "9:16" ? 0.82 : 0.78;
  return Math.max(120, even(Math.round(basis * scale)));
}

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
  const discSize = getDiscSize(width, height, aspectRatio);
  const discX = (width - discSize) / 2;
  const discY = (height - discSize) / 2 - (aspectRatio === "9:16" ? height * 0.02 : 0);
  const glowSize = discSize * 1.08;
  const glowX = (width - glowSize) / 2;
  const glowY = (height - glowSize) / 2 - (aspectRatio === "9:16" ? height * 0.02 : 0);

  return (
    <View
      style={[styles.stage, { width, height }]}
      accessibilityLabel={`${playbackLabel}. ${trackTitle}. ${subtitle}`}
    >
      <View
        style={[
          styles.glow,
          {
            left: glowX,
            top: glowY,
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
          },
        ]}
      />

      <View
        style={[
          styles.discWrap,
          {
            left: discX,
            top: discY,
          },
        ]}
      >
        <VinylPreview imageUri={photoUri ?? null} size={discSize} spinning={isPlaying} />
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
              borderRadius: discSize / 2,
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
    backgroundColor: "#030304",
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
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  discWrap: {
    position: "absolute",
  },
  playTouch: {
    position: "absolute",
    backgroundColor: "transparent",
  },
});
