import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, spacing, typography } from "@/constants/tokens";
import { pressScaleStyle, PRESS_SCALE_SUBTLE } from "@/lib/pressFeedback";
import { ONBOARDING_STEP_COUNT } from "@/lib/onboardingSteps";
import { onboardingCopy } from "@/constants/onboardingCopy";

type Props = {
  stepIndex: number;
  progress: number;
  onSkip?: () => void;
  skipDisabled?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  showBackdrop?: boolean;
};

export function OnboardingWizardChrome({
  stepIndex,
  progress,
  onSkip,
  skipDisabled = false,
  children,
  footer,
  showBackdrop = true,
}: Props) {
  const clampedProgress = Math.max(0, Math.min(1, progress));

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {showBackdrop ? (
        <>
          <View style={styles.backdropBlobA} />
          <View style={styles.backdropBlobB} />
        </>
      ) : null}

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${clampedProgress * 100}%` }]} />
      </View>

      <View style={styles.header}>
        <Text style={styles.stepCounter}>
          {stepIndex + 1}/{ONBOARDING_STEP_COUNT}
        </Text>
        {onSkip ? (
          <Pressable
            style={({ pressed }) => [
              styles.skipButton,
              skipDisabled && styles.skipButtonDisabled,
              pressScaleStyle(pressed && !skipDisabled, PRESS_SCALE_SUBTLE),
            ]}
            onPress={onSkip}
            disabled={skipDisabled}
            accessibilityLabel={onboardingCopy.skip}
            accessibilityRole="button"
          >
            <Text style={styles.skipButtonText}>{onboardingCopy.skip}</Text>
          </Pressable>
        ) : (
          <View style={styles.skipPlaceholder} />
        )}
      </View>

      <View style={styles.body}>{children}</View>

      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  backdropBlobA: {
    position: "absolute",
    top: -100,
    right: -70,
    width: 260,
    height: 260,
    borderRadius: radius.full,
    backgroundColor: colors.brand.tintStrong,
  },
  backdropBlobB: {
    position: "absolute",
    bottom: -130,
    left: -90,
    width: 300,
    height: 300,
    borderRadius: radius.full,
    backgroundColor: colors.brand.tint,
  },
  progressTrack: {
    height: 3,
    backgroundColor: colors.light.surfaceMuted,
  },
  progressFill: {
    height: 3,
    backgroundColor: colors.light.text,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  stepCounter: {
    ...typography.caption,
    color: colors.light.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "600",
  },
  skipButton: {
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.overlay.light,
  },
  skipButtonDisabled: {
    opacity: 0.45,
  },
  skipButtonText: {
    ...typography.caption,
    color: colors.light.text,
    fontWeight: "600",
  },
  skipPlaceholder: {
    width: 64,
  },
  body: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
});
