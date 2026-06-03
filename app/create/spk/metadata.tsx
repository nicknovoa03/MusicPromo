import { useState, useCallback, useEffect, useRef } from "react";
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
import {
  KeyboardDismissAccessory,
  KEYBOARD_DISMISS_ACCESSORY_ID,
} from "@/components/KeyboardDismissAccessory";
import { useKeyboardVisible } from "@/hooks/useKeyboardVisible";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ReleaseDatePickerModal } from "@/components/spk/ReleaseDatePickerModal";
import { colors, typography, spacing, radius } from "@/constants/tokens";
import { SpkFlowHeader } from "@/components/spk/SpkFlowHeader";
import { useSpkClose } from "@/hooks/useSpkClose";
import { useSpkWizardBack } from "@/hooks/useSpkWizardBack";
import { useSpkScreenParams } from "@/hooks/useSpkScreenParams";
import { useSpkDraft } from "@/providers/SpkDraftContext";
import {
  formatSpkReleaseDateLabel,
  parseSpkReleaseDateToDate,
  toSpkReleaseDateStorage,
} from "@/lib/spkReleaseDate";

export default function SpkMetadataScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useSpkScreenParams("metadata");
  const { draft, mergeDraft, isExistingProject, getNavigationParams } = useSpkDraft();

  const artistName = draft.artistName ?? "";
  const photoUri = draft.photoUri ?? null;
  const title = draft.title ?? "";
  const vision = draft.vision ?? "";
  const genre = draft.genre ?? "";
  const bpm = draft.bpm ?? "";
  const label = draft.label ?? "";
  const collaborators = draft.collaborators ?? "";

  const [releaseDate, setReleaseDate] = useState<Date | null>(() =>
    parseSpkReleaseDateToDate(draft.releaseDate ?? ""),
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const keyboardVisible = useKeyboardVisible();

  const genreRef = useRef<TextInput>(null);
  const bpmRef = useRef<TextInput>(null);
  const labelRef = useRef<TextInput>(null);
  const collaboratorsRef = useRef<TextInput>(null);

  useEffect(() => {
    setReleaseDate(parseSpkReleaseDateToDate(draft.releaseDate ?? ""));
  }, [draft.releaseDate]);

  const storedReleaseDate = releaseDate
    ? toSpkReleaseDateStorage(releaseDate)
    : (draft.releaseDate?.trim() ?? "");
  const releaseDateLabel = formatSpkReleaseDateLabel(storedReleaseDate);

  const { goBackOneStep, canStepBack } = useSpkWizardBack("metadata");
  const { handleClose, isSaving } = useSpkClose({
    step: "metadata",
    persistStatus: isExistingProject ? "exported" : "draft",
    getFlushPatch: () => ({
      genre: genre.trim(),
      bpm: bpm.trim(),
      releaseDate: storedReleaseDate,
      label: label.trim(),
      collaborators: collaborators.trim(),
    }),
  });

  const openReleaseDatePicker = useCallback(() => {
    setShowDatePicker(true);
  }, []);

  const confirmReleaseDate = useCallback(
    (date: Date) => {
      setReleaseDate(date);
      mergeDraft({ releaseDate: toSpkReleaseDateStorage(date) });
      setShowDatePicker(false);
    },
    [mergeDraft],
  );

  const clearReleaseDate = useCallback(() => {
    setReleaseDate(null);
    mergeDraft({ releaseDate: "" });
    setShowDatePicker(false);
  }, [mergeDraft]);

  const handleNext = useCallback(() => {
    mergeDraft({
      step: "preview",
      genre: genre.trim(),
      bpm: bpm.trim(),
      releaseDate: storedReleaseDate,
      label: label.trim(),
      collaborators: collaborators.trim(),
    });
    router.push({
      pathname: "/create/spk/preview" as any,
      params: getNavigationParams("preview"),
    });
  }, [
    router,
    genre,
    bpm,
    storedReleaseDate,
    label,
    collaborators,
    mergeDraft,
    getNavigationParams,
  ]);

  const text = colors.dark.text;
  const secondary = colors.dark.textSecondary;
  const surface = colors.dark.surface;
  const border = colors.dark.border;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <SpkFlowHeader
        title="Track Details"
        stepLabel="3 of 4"
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
          {/* Track strip */}
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

          <Text style={[styles.hint, { color: secondary }]}>
            All fields are optional — fill in what's relevant for this release.
          </Text>

          <Text style={[styles.fieldLabel, { color: secondary }]}>Genre</Text>
          <View style={[styles.inputWrapper, { backgroundColor: surface, borderColor: border }, styles.fieldGap]}>
            <TextInput
              ref={genreRef}
              style={[styles.textInput, { color: text }]}
              placeholder="e.g. R&B, Hip-Hop, Afrobeats"
              placeholderTextColor={secondary}
              value={genre}
              onChangeText={(text) => mergeDraft({ genre: text })}
              returnKeyType="next"
              blurOnSubmit={false}
              inputAccessoryViewID={KEYBOARD_DISMISS_ACCESSORY_ID}
              onSubmitEditing={() => bpmRef.current?.focus()}
              maxLength={50}
            />
          </View>

          <Text style={[styles.fieldLabel, { color: secondary }]}>BPM</Text>
          <View style={[styles.inputWrapper, { backgroundColor: surface, borderColor: border }, styles.fieldGap]}>
            <TextInput
              ref={bpmRef}
              style={[styles.textInput, { color: text }]}
              placeholder="e.g. 95"
              placeholderTextColor={secondary}
              value={bpm}
              onChangeText={(v) => mergeDraft({ bpm: v.replace(/[^0-9]/g, "") })}
              keyboardType="number-pad"
              inputAccessoryViewID={KEYBOARD_DISMISS_ACCESSORY_ID}
              maxLength={3}
            />
          </View>

          <Text style={[styles.fieldLabel, { color: secondary }]}>Release Date</Text>
          <Pressable
            style={({ pressed }) => [
              styles.inputWrapper,
              styles.dateField,
              { backgroundColor: surface, borderColor: border },
              styles.fieldGap,
              pressed && styles.pressed,
            ]}
            onPress={openReleaseDatePicker}
            accessibilityRole="button"
            accessibilityLabel={releaseDateLabel ? `Release date ${releaseDateLabel}` : "Select release date"}
          >
            <Text
              style={[styles.dateFieldText, { color: releaseDateLabel ? text : secondary }]}
              numberOfLines={1}
            >
              {releaseDateLabel || "Select a date"}
            </Text>
            <Ionicons name="calendar-outline" size={20} color={secondary} />
          </Pressable>
          {releaseDate ? (
            <Pressable
              onPress={clearReleaseDate}
              style={({ pressed }) => [styles.clearDateButton, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Clear release date"
            >
              <Text style={[styles.clearDateText, { color: secondary }]}>Clear date</Text>
            </Pressable>
          ) : null}

          <Text style={[styles.fieldLabel, { color: secondary }]}>Label</Text>
          <View style={[styles.inputWrapper, { backgroundColor: surface, borderColor: border }, styles.fieldGap]}>
            <TextInput
              ref={labelRef}
              style={[styles.textInput, { color: text }]}
              placeholder="e.g. Indie / Self-Released"
              placeholderTextColor={secondary}
              value={label}
              onChangeText={(text) => mergeDraft({ label: text })}
              returnKeyType="next"
              blurOnSubmit={false}
              inputAccessoryViewID={KEYBOARD_DISMISS_ACCESSORY_ID}
              onSubmitEditing={() => collaboratorsRef.current?.focus()}
              maxLength={60}
            />
          </View>

          <Text style={[styles.fieldLabel, { color: secondary }]}>Collaborators</Text>
          <View style={[styles.inputWrapper, { backgroundColor: surface, borderColor: border }]}>
            <TextInput
              ref={collaboratorsRef}
              style={[styles.textInput, { color: text }]}
              placeholder="e.g. Feat. John Smith, Prod. DJ Max"
              placeholderTextColor={secondary}
              value={collaborators}
              onChangeText={(text) => mergeDraft({ collaborators: text })}
              returnKeyType="done"
              inputAccessoryViewID={KEYBOARD_DISMISS_ACCESSORY_ID}
              onSubmitEditing={() => collaboratorsRef.current?.blur()}
              maxLength={100}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {!keyboardVisible ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
          <Pressable
            style={({ pressed }) => [styles.nextButton, pressed && styles.pressed]}
            onPress={handleNext}
            accessibilityRole="button"
            accessibilityLabel="Next step"
          >
            <Text style={styles.nextButtonText}>Next</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.accent.onPrimary} />
          </Pressable>
        </View>
      ) : null}

      <KeyboardDismissAccessory />

      <ReleaseDatePickerModal
        visible={showDatePicker}
        value={releaseDate}
        onConfirm={confirmReleaseDate}
        onClear={clearReleaseDate}
        onDismiss={() => setShowDatePicker(false)}
      />
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
  hint: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  fieldGap: {
    marginBottom: spacing.lg,
  },
  inputWrapper: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === "ios" ? spacing.md : spacing.sm,
  },
  textInput: {
    ...typography.body,
    padding: 0,
  },
  dateField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  dateFieldText: {
    ...typography.body,
    flex: 1,
  },
  clearDateButton: {
    alignSelf: "flex-start",
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
    paddingVertical: spacing.xs,
  },
  clearDateText: {
    fontSize: 13,
    fontWeight: "500",
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
  nextButtonText: {
    ...typography.button,
    color: colors.accent.onPrimary,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.985 }],
  },
});
