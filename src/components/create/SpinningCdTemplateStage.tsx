import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "@/constants/tokens";
import { VinylPreview } from "@/components/create/VinylPreview";

interface SpinningCdTemplateStageProps {
  width: number;
  height: number;
  vinylSize: number;
  photoUri?: string | null;
  isPlaying: boolean;
  playbackLabel: string;
  trackTitle: string;
  subtitle: string;
  onTogglePlay?: () => void;
}

export function SpinningCdTemplateStage({
  width,
  height,
  vinylSize,
  photoUri,
  isPlaying,
  playbackLabel,
  trackTitle,
  subtitle,
  onTogglePlay,
}: SpinningCdTemplateStageProps) {
  return (
    <View style={[styles.turntableStage, { width, height }]}>
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
      <View style={styles.stageHaloTop} />
      <View style={styles.stageHaloBottom} />
      <View style={styles.stageBottomShade} />

      <View
        style={[
          styles.stageVinylWrap,
          {
            left: -vinylSize * 0.5,
            top: -vinylSize * 0.24,
          },
        ]}
      >
        <VinylPreview imageUri={photoUri ?? null} size={vinylSize} spinning={isPlaying} />
      </View>

      <View style={styles.tonearmPivot} />
      <View style={styles.tonearmArm} />
      <View style={styles.tonearmHead} />

      <View style={styles.stageTextBlock}>
        <Text style={styles.nowPlayingLabel}>{playbackLabel}</Text>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {trackTitle}
        </Text>
        <View style={styles.trackSubtitlePill}>
          <Text style={styles.trackSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </View>

      <View style={styles.stageTransport}>
        {onTogglePlay ? (
          <Pressable
            onPress={onTogglePlay}
            style={({ pressed }) => [
              styles.stageControlPill,
              pressed && styles.stageControlPillPressed,
            ]}
            accessibilityLabel={isPlaying ? "Pause preview" : "Play preview"}
            accessibilityRole="button"
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={16}
              color={colors.dark.text}
            />
          </Pressable>
        ) : (
          <View style={styles.stageControlPill}>
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={16}
              color={colors.dark.text}
            />
          </View>
        )}
        <View style={styles.stageTransportSpacer} />
        <View style={[styles.stageControlPill, styles.stageControlPillGhost]}>
          <Ionicons
            name="play-skip-back"
            size={16}
            color="rgba(255,255,255,0.7)"
          />
        </View>
        <View style={[styles.stageControlPill, styles.stageControlPillGhost]}>
          <Ionicons
            name="play-skip-forward"
            size={16}
            color="rgba(255,255,255,0.7)"
          />
        </View>
      </View>
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
  stageHaloTop: {
    position: "absolute",
    top: -90,
    right: -72,
    width: 260,
    height: 220,
    borderRadius: 130,
    backgroundColor: "rgba(255,255,255,0.4)",
    transform: [{ rotate: "-12deg" }],
  },
  stageHaloBottom: {
    position: "absolute",
    bottom: -110,
    left: -40,
    width: 300,
    height: 210,
    borderRadius: 160,
    backgroundColor: "rgba(255,255,255,0.36)",
    transform: [{ rotate: "15deg" }],
  },
  stageBottomShade: {
    position: "absolute",
    left: -70,
    right: -70,
    bottom: 0,
    height: 210,
    borderTopLeftRadius: 240,
    borderTopRightRadius: 240,
    backgroundColor: "rgba(18,18,24,0.18)",
  },
  stageVinylWrap: {
    position: "absolute",
  },
  tonearmPivot: {
    position: "absolute",
    top: 30,
    right: 28,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(122,123,129,0.25)",
  },
  tonearmArm: {
    position: "absolute",
    top: 56,
    right: 58,
    width: 10,
    height: 196,
    borderRadius: radius.full,
    backgroundColor: "#CED1D4",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.28)",
  },
  tonearmHead: {
    position: "absolute",
    top: 244,
    right: 45,
    width: 26,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#24252B",
    transform: [{ rotate: "26deg" }],
  },
  stageTextBlock: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: 94,
    gap: spacing.xs,
  },
  nowPlayingLabel: {
    ...typography.body,
    color: "#FFFFFF",
    fontSize: 32,
    lineHeight: 34,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  trackTitle: {
    ...typography.body,
    color: "rgba(255,255,255,0.96)",
    fontSize: 18,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  trackSubtitlePill: {
    alignSelf: "flex-start",
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  trackSubtitle: {
    ...typography.caption,
    color: "rgba(21,22,26,0.9)",
    fontSize: 14,
    fontWeight: "700",
  },
  stageTransport: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
  },
  stageTransportSpacer: {
    flex: 1,
  },
  stageControlPill: {
    minWidth: 56,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#1E1F24",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  stageControlPillPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },
  stageControlPillGhost: {
    marginLeft: spacing.sm,
  },
});
