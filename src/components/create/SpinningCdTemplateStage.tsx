import { Image, Pressable, StyleSheet, View } from "react-native";
import { radius } from "@/constants/tokens";
import { VinylPreview } from "@/components/create/VinylPreview";
import {
  getSpinningCdTemplateLayout,
} from "@/lib/spinningCdTemplateSpec";
import type { TemplateStageProps } from "@/lib/templates";

export function SpinningCdTemplateStage({
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
  const layout = getSpinningCdTemplateLayout({ width, height, aspectRatio });

  return (
    <View
      style={[styles.turntableStage, { width, height }]}
      accessibilityLabel={`${playbackLabel}. ${trackTitle}. ${subtitle}`}
    >
      {photoUri ? (
        <Image
          source={{ uri: photoUri }}
          style={styles.stageBackdropImage}
          resizeMode="cover"
          blurRadius={18}
          accessibilityLabel="Preview backdrop"
        />
      ) : null}
      <View style={styles.stageBackdropTint} />

      <View
        style={[
          styles.haloTop,
          {
            left: layout.haloTopX,
            top: layout.haloTopY,
            width: layout.haloTopWidth,
            height: layout.haloTopHeight,
            borderRadius: layout.haloTopRadiusX,
          },
        ]}
      />
      <View
        style={[
          styles.haloBottom,
          {
            left: layout.haloBottomX,
            top: layout.haloBottomY,
            width: layout.haloBottomWidth,
            height: layout.haloBottomHeight,
            borderRadius: layout.haloBottomRadiusX,
          },
        ]}
      />
      <View
        style={[
          styles.bottomShade,
          {
            left: layout.bottomShadeX,
            top: layout.bottomShadeY,
            width: layout.bottomShadeWidth,
            height: layout.bottomShadeHeight,
            borderRadius: layout.bottomShadeRadiusX,
          },
        ]}
      />

      <View
        style={[
          styles.arcTop,
          {
            left: layout.arcTopX,
            top: layout.arcTopY,
            width: layout.arcTopSize,
            height: layout.arcTopSize,
            borderRadius: layout.arcTopRadius,
          },
        ]}
      />
      <View
        style={[
          styles.arcMid,
          {
            left: layout.arcMidX,
            top: layout.arcMidY,
            width: layout.arcMidSize,
            height: layout.arcMidSize,
            borderRadius: layout.arcMidRadius,
          },
        ]}
      />
      <View
        style={[
          styles.arcBottom,
          {
            left: layout.arcBottomX,
            top: layout.arcBottomY,
            width: layout.arcBottomSize,
            height: layout.arcBottomSize,
            borderRadius: layout.arcBottomRadius,
          },
        ]}
      />

      <View
        style={[
          styles.stageVinylWrap,
          {
            left: layout.recordX,
            top: layout.recordY,
          },
        ]}
      >
        <VinylPreview
          imageUri={photoUri ?? null}
          size={layout.recordSize}
          spinning={isPlaying}
          tone="spinning-cd"
        />
      </View>

      <View
        style={[
          styles.tonearmPivot,
          {
            left: layout.tonearmPivotX,
            top: layout.tonearmPivotY,
            width: layout.tonearmPivotSize,
            height: layout.tonearmPivotSize,
            borderRadius: layout.tonearmPivotRadius,
          },
        ]}
      />
      <View
        style={[
          styles.tonearmShadow,
          {
            left: layout.armShadowX,
            top: layout.armShadowY,
            width: layout.armShadowWidth,
            height: layout.armShadowHeight,
          },
        ]}
      />
      <View
        style={[
          styles.tonearmArm,
          {
            left: layout.armX,
            top: layout.armY,
            width: layout.armWidth,
            height: layout.armHeight,
            borderRadius: layout.armWidth,
          },
        ]}
      />
      <View
        style={[
          styles.tonearmCap,
          {
            left: layout.armCapX,
            top: layout.armCapY,
            width: layout.armCapWidth,
            height: layout.armCapHeight,
          },
        ]}
      />
      <View
        style={[
          styles.tonearmHead,
          {
            left: layout.armHeadX,
            top: layout.armHeadY,
            width: layout.armHeadWidth,
            height: layout.armHeadHeight,
          },
        ]}
      />

      <View
        style={[
          styles.textBarPrimary,
          {
            left: layout.textBlockX,
            top: layout.textNowY,
            width: layout.textNowWidth,
            height: layout.textNowHeight,
          },
        ]}
      />
      <View
        style={[
          styles.textBarSecondary,
          {
            left: layout.textBlockX,
            top: layout.textTitleY,
            width: layout.textTitleWidth,
            height: layout.textTitleHeight,
          },
        ]}
      />
      <View
        style={[
          styles.textPill,
          {
            left: layout.textBlockX,
            top: layout.textPillY,
            width: layout.textPillWidth,
            height: layout.textPillHeight,
            borderRadius: layout.textPillHeight / 2,
          },
        ]}
      />

      <View
        style={[
          styles.controlPrimary,
          {
            left: layout.leftControlX,
            top: layout.controlsY,
            width: layout.controlWidth,
            height: layout.controlHeight,
          },
        ]}
      />
      <View
        style={[
          styles.controlGhost,
          {
            left: layout.middleControlX,
            top: layout.controlsY,
            width: layout.controlWidth,
            height: layout.controlHeight,
          },
        ]}
      />
      <View
        style={[
          styles.controlGhost,
          {
            left: layout.rightControlX,
            top: layout.controlsY,
            width: layout.controlWidth,
            height: layout.controlHeight,
          },
        ]}
      />

      <View
        style={[
          styles.iconBarStrong,
          {
            left: layout.leftControlX + layout.iconInset,
            top: layout.controlsY + layout.iconInset,
            width: layout.iconBarWidth,
            height: layout.iconBarHeight,
          },
        ]}
      />
      <View
        style={[
          styles.iconBarStrong,
          {
            left: layout.leftControlX + layout.iconInset + layout.iconBarWidth + 4,
            top: layout.controlsY + layout.iconInset,
            width: layout.iconBarWidth,
            height: layout.iconBarHeight,
          },
        ]}
      />
      <View
        style={[
          styles.iconBarSoft,
          {
            left: layout.middleControlX + layout.iconInset + 8,
            top: layout.controlsY + layout.iconInset + 2,
            width: layout.iconBarWidth,
            height: layout.iconBarHeight,
          },
        ]}
      />
      <View
        style={[
          styles.iconBarSoft,
          {
            left: layout.rightControlX + layout.iconInset + 8,
            top: layout.controlsY + layout.iconInset + 2,
            width: layout.iconBarWidth,
            height: layout.iconBarHeight,
          },
        ]}
      />

      {onTogglePlay ? (
        <Pressable
          onPress={onTogglePlay}
          style={({ pressed }) => [
            styles.controlHitArea,
            {
              left: layout.leftControlX,
              top: layout.controlsY,
              width: layout.controlWidth,
              height: layout.controlHeight,
              opacity: pressed ? 0.82 : 1,
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
  turntableStage: {
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: "#BCBEC2",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 10,
  },
  stageBackdropImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.26,
  },
  stageBackdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(196,198,204,0.88)",
  },
  haloTop: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.4)",
    transform: [{ rotate: "-12deg" }],
  },
  haloBottom: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.36)",
    transform: [{ rotate: "15deg" }],
  },
  bottomShade: {
    position: "absolute",
    backgroundColor: "rgba(18,18,24,0.18)",
  },
  arcTop: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.33)",
  },
  arcMid: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.23)",
  },
  arcBottom: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  stageVinylWrap: {
    position: "absolute",
  },
  tonearmPivot: {
    position: "absolute",
    backgroundColor: "rgba(122,123,129,0.26)",
  },
  tonearmShadow: {
    position: "absolute",
    backgroundColor: "rgba(127,129,136,0.22)",
  },
  tonearmArm: {
    position: "absolute",
    backgroundColor: "rgba(223,225,232,0.92)",
  },
  tonearmCap: {
    position: "absolute",
    backgroundColor: "rgba(31,32,40,0.96)",
  },
  tonearmHead: {
    position: "absolute",
    backgroundColor: "rgba(25,26,32,0.98)",
  },
  textBarPrimary: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.96)",
  },
  textBarSecondary: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.86)",
  },
  textPill: {
    position: "absolute",
    backgroundColor: "rgba(242,242,242,0.96)",
  },
  controlPrimary: {
    position: "absolute",
    backgroundColor: "rgba(30,31,36,1)",
  },
  controlGhost: {
    position: "absolute",
    backgroundColor: "rgba(30,31,36,0.96)",
  },
  iconBarStrong: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.94)",
  },
  iconBarSoft: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.84)",
  },
  controlHitArea: {
    position: "absolute",
    backgroundColor: "transparent",
  },
});
