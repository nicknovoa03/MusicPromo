import { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, typography, spacing, radius } from "@/constants/tokens";
import { SpkFlowHeader } from "@/components/spk/SpkFlowHeader";
import { useSpkClose } from "@/hooks/useSpkClose";
import { useSpkWizardBack } from "@/hooks/useSpkWizardBack";
import { useSpkScreenParams } from "@/hooks/useSpkScreenParams";
import { useSpkDraft } from "@/providers/SpkDraftContext";

const MAX_VISION_CHARS = 280;

export default function SpkVisionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useSpkScreenParams("vision");
  const { draft, mergeDraft, isExistingProject, getNavigationParams } = useSpkDraft();

  const artistName = draft.artistName ?? "";
  const photoUri = draft.photoUri ?? null;
  const title = draft.title ?? "";
  const vision = draft.vision ?? "";
  const remaining = MAX_VISION_CHARS - vision.length;
  const canAdvance = vision.trim().length > 0;

  const { goBackOneStep, canStepBack } = useSpkWizardBack("vision");
  const { handleClose, isSaving } = useSpkClose({
    step: "vision",
    persistStatus: isExistingProject ? "exported" : "draft",
  });

  const handleNext = useCallback(() => {
    if (!canAdvance) return;
    mergeDraft({ step: "metadata", vision: vision.trim() });
    router.push({
      pathname: "/create/spk/metadata" as any,
      params: getNavigationParams("metadata"),
    });
  }, [canAdvance, router, vision, mergeDraft, getNavigationParams]);

  const text = colors.dark.text;
  const secondary = colors.dark.textSecondary;
  const surface = colors.dark.surface;
  const border = colors.dark.border;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <SpkFlowHeader
        title="Vision"
        stepLabel="2 of 4"
        showBackButton={canStepBack}
        onBack={goBackOneStep}
        onExit={handleClose}
        isSaving={isSaving}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Track preview strip */}
          <View style={[styles.trackStrip, { backgroundColor: surface, borderColor: border }]}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.stripThumb} resizeMode="cover" />
            ) : (
              <View style={[styles.stripThumb, styles.stripThumbEmpty]}>
                <Ionicons name="image-outline" size={18} color={secondary} />
              </View>
            )}
            <View style={styles.stripInfo}>
              <Text style={[styles.stripTitle, { color: text }]} numberOfLines={1}>
                {title || "Untitled"}
              </Text>
              {artistName ? (
                <Text style={[styles.stripSubtitle, { color: secondary }]} numberOfLines={1}>
                  by {artistName}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Tip box */}
          <View style={[styles.tipBox, { backgroundColor: colors.dark.surfaceMuted }]}>
            <Text style={[styles.tipLabel, { color: text }]}>Tip</Text>
            <Text style={[styles.tipText, { color: secondary }]}>
              Tell the story of why you made this track. What inspired it? What mood should listeners feel?
            </Text>
          </View>

          {/* Vision input */}
          <Text style={[styles.inputLabel, { color: secondary }]}>
            Vision / Concept
          </Text>
          <View style={[styles.inputCard, { backgroundColor: surface, borderColor: border }]}>
            <TextInput
              style={[styles.textInput, { color: text }]}
              placeholder={"What's the story behind this track?"}
              placeholderTextColor={colors.dark.textSecondary}
              value={vision}
              onChangeText={(v) => {
                if (v.length <= MAX_VISION_CHARS) mergeDraft({ vision: v });
              }}
              multiline
              autoFocus
              returnKeyType="default"
              textAlignVertical="top"
            />
            <Text
              style={[
                styles.charCounter,
                { color: remaining <= 30 ? "#FF6B6B" : secondary },
              ]}
            >
              {remaining}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <Pressable
          style={({ pressed }) => [
            styles.nextButton,
            !canAdvance && styles.nextButtonDisabled,
            pressed && canAdvance && styles.pressed,
          ]}
          onPress={handleNext}
          disabled={!canAdvance}
          accessibilityRole="button"
          accessibilityLabel="Next step"
          accessibilityState={{ disabled: !canAdvance }}
        >
          <Text style={[styles.nextButtonText, !canAdvance && styles.nextButtonTextDisabled]}>
            Next
          </Text>
          <Ionicons
            name="arrow-forward"
            size={18}
            color={canAdvance ? colors.accent.onPrimary : secondary}
          />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  trackStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.md,
  },
  stripThumb: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  stripThumbEmpty: {
    backgroundColor: colors.dark.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  stripInfo: {
    flex: 1,
    gap: 2,
  },
  stripTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  stripSubtitle: {
    fontSize: 12,
    fontWeight: "400",
  },
  tipBox: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: 4,
  },
  tipLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  tipText: {
    fontSize: 13,
    lineHeight: 19,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  inputCard: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    minHeight: 180,
  },
  textInput: {
    fontSize: 17,
    lineHeight: 24,
    flex: 1,
    minHeight: 140,
    padding: 0,
  },
  charCounter: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "right",
    marginTop: spacing.sm,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.dark.border,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.accent.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  nextButtonDisabled: {
    opacity: 0.3,
  },
  nextButtonText: {
    ...typography.button,
    color: colors.accent.onPrimary,
  },
  nextButtonTextDisabled: {
    color: colors.dark.textSecondary,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.985 }],
  },
});
