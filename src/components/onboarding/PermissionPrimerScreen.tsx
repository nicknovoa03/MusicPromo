import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, radius, spacing, typography } from "@/constants/tokens";
import { onboardingCopy } from "@/constants/onboardingCopy";
import type { PermissionPrimerId } from "@/lib/permissions";
import { OnboardingPrimaryButton } from "./OnboardingPrimaryButton";
import { OnboardingSecondaryButton } from "./OnboardingSecondaryButton";
import { OnboardingWizardChrome } from "./OnboardingWizardChrome";

type PrimerContent = {
  title: string;
  body: string;
  bullet: string;
};

const PRIMER_CONTENT: Record<Exclude<PermissionPrimerId, "perm-save">, PrimerContent> = {
  "perm-photos": onboardingCopy.permPhotos,
  "perm-audio": onboardingCopy.permAudio,
};

const PRIMER_ICONS: Record<PermissionPrimerId, keyof typeof Ionicons.glyphMap> = {
  "perm-photos": "images-outline",
  "perm-audio": "musical-notes-outline",
  "perm-save": "download-outline",
};

type Props = {
  primerId: PermissionPrimerId;
  stepIndex: number;
  progress: number;
  title?: string;
  body?: string;
  bullet?: string;
  alreadyGranted?: boolean;
  deniedMessage?: string | null;
  isContinuing?: boolean;
  onSkip?: () => void;
  onNotNow: () => void;
  onContinue: () => void;
  skipDisabled?: boolean;
};

export function PermissionPrimerScreen({
  primerId,
  stepIndex,
  progress,
  title,
  body,
  bullet,
  alreadyGranted = false,
  deniedMessage = null,
  isContinuing = false,
  onSkip,
  onNotNow,
  onContinue,
  skipDisabled = false,
}: Props) {
  const fallback =
    primerId === "perm-save"
      ? onboardingCopy.permSave
      : PRIMER_CONTENT[primerId];
  const copy = {
    title: title ?? fallback.title,
    body: body ?? fallback.body,
    bullet: bullet ?? fallback.bullet,
  };

  return (
    <OnboardingWizardChrome
      stepIndex={stepIndex}
      progress={progress}
      onSkip={onSkip}
      skipDisabled={skipDisabled || isContinuing}
      showBackdrop={false}
      footer={
        <>
          {deniedMessage ? (
            <View style={styles.deniedCard}>
              <Text style={styles.deniedText}>{deniedMessage}</Text>
            </View>
          ) : null}
          {alreadyGranted ? (
            <Text style={styles.grantedText}>{onboardingCopy.alreadyGranted}</Text>
          ) : null}
          <OnboardingSecondaryButton
            label={onboardingCopy.notNow}
            onPress={onNotNow}
            disabled={isContinuing}
          />
          <OnboardingPrimaryButton
            label={onboardingCopy.continue}
            onPress={onContinue}
            loading={isContinuing}
            disabled={isContinuing}
          />
        </>
      }
    >
      <View style={styles.content}>
        <View style={styles.iconShell}>
          {isContinuing ? (
            <ActivityIndicator size="small" color={colors.light.text} />
          ) : (
            <Ionicons name={PRIMER_ICONS[primerId]} size={36} color={colors.light.text} />
          )}
        </View>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.body}>{copy.body}</Text>
        <View style={styles.bulletRow}>
          <Ionicons name="checkmark-circle-outline" size={18} color={colors.light.textSecondary} />
          <Text style={styles.bullet}>{copy.bullet}</Text>
        </View>
      </View>
    </OnboardingWizardChrome>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
    gap: spacing.md,
  },
  iconShell: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: colors.light.text,
  },
  body: {
    ...typography.body,
    color: colors.light.textSecondary,
    lineHeight: 24,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  bullet: {
    ...typography.body,
    color: colors.light.text,
    flex: 1,
  },
  deniedCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    padding: spacing.md,
  },
  deniedText: {
    ...typography.caption,
    color: colors.light.textSecondary,
    lineHeight: 18,
  },
  grantedText: {
    ...typography.caption,
    color: colors.light.textSecondary,
    textAlign: "center",
    fontWeight: "600",
  },
});
