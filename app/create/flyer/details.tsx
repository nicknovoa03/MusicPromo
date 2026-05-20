import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  useColorScheme,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { colors, typography, spacing, radius } from "@/constants/tokens";
import { ReleaseDatePickerModal } from "@/components/spk/ReleaseDatePickerModal";
import { EventTimePickerModal } from "@/components/flyer/EventTimePickerModal";
import { FlyerFlowHeader } from "@/components/flyer/FlyerFlowHeader";
import { formatTimeDisplay } from "@/lib/flyerEventTime";
import { useFlyerDraft } from "@/providers/FlyerDraftContext";
import { useFlyerScreenParams } from "@/hooks/useFlyerScreenParams";
import { useFlyerClose } from "@/hooks/useFlyerClose";
import { useFlyerWizardBack } from "@/hooks/useFlyerWizardBack";
import { defaultFlyerLineup, getFlyerStepLabel } from "@/lib/flyerDraft";

function formatDisplayDate(iso: string | undefined): string {
  if (!iso?.trim()) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function FlyerDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  useFlyerScreenParams("details");

  const { draft, mergeDraft, getNavigationParams, isExistingProject } = useFlyerDraft();
  const { handleClose, saveAndContinue, isSaving } = useFlyerClose({
    step: "details",
    persistStatus: isExistingProject ? "exported" : "draft",
    getFlushPatch: () => ({
      step: "editor",
      lineupJson:
        draft.lineupJson ?? JSON.stringify(defaultFlyerLineup()),
    }),
  });
  const { goBackOneStep, canStepBack } = useFlyerWizardBack("details");
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [startTimePickerVisible, setStartTimePickerVisible] = useState(false);
  const [endTimePickerVisible, setEndTimePickerVisible] = useState(false);

  const bg = isDark ? colors.dark.background : colors.light.background;
  const surface = isDark ? colors.dark.surface : colors.light.surface;
  const text = isDark ? colors.dark.text : colors.light.text;
  const secondary = isDark ? colors.dark.textSecondary : colors.light.textSecondary;
  const border = isDark ? colors.dark.border : colors.light.border;

  const canAdvance = Boolean(
    draft.eventName?.trim() &&
      draft.eventDate?.trim() &&
      draft.eventTime?.trim() &&
      draft.venue?.trim(),
  );

  const pickPhoto = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    mergeDraft({
      photoUri: asset.uri,
      photoName: asset.fileName ?? "photo",
    });
  }, [mergeDraft]);

  const pickAudio = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "audio/*",
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    mergeDraft({
      audioUri: asset.uri,
      audioName: asset.name,
      trimStart: 0,
      trimEnd: 8,
    });
  }, [mergeDraft]);

  const handleNext = useCallback(async () => {
    if (!canAdvance || isSaving) return;
    if (!draft.lineupJson) {
      mergeDraft({ lineupJson: JSON.stringify(defaultFlyerLineup()) });
    }
    await saveAndContinue();
    router.push({
      pathname: "/create/flyer/editor",
      params: getNavigationParams("editor"),
    } as any);
  }, [
    canAdvance,
    draft.lineupJson,
    getNavigationParams,
    isSaving,
    mergeDraft,
    router,
    saveAndContinue,
  ]);

  const eventDateValue = draft.eventDate
    ? new Date(draft.eventDate)
    : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={["top", "bottom"]}>
      <FlyerFlowHeader
        title="New Event Flyer"
        stepLabel={getFlyerStepLabel("details")}
        showBackButton={canStepBack}
        onBack={goBackOneStep}
        onExit={handleClose}
        isSaving={isSaving}
        tone="light"
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + spacing.lg },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          style={[styles.mediaCard, { backgroundColor: surface }]}
          onPress={pickAudio}
          accessibilityRole="button"
          accessibilityLabel="Add audio"
        >
          <View style={[styles.mediaIcon, { backgroundColor: isDark ? colors.dark.surfaceMuted : colors.light.surfaceMuted }]}>
            <Ionicons name="musical-note-outline" size={24} color={text} />
          </View>
          <View style={styles.mediaBody}>
            <Text style={[styles.mediaTitle, { color: text }]}>
              {draft.audioUri ? (draft.audioName ?? "Audio added") : "Add Audio"}
            </Text>
            <Text style={[styles.mediaHint, { color: secondary }]}>
              Optional · 10–30 sec clip
            </Text>
          </View>
          <Ionicons name={draft.audioUri ? "checkmark-circle" : "add"} size={22} color={secondary} />
        </Pressable>

        <Pressable
          style={[styles.mediaCard, { backgroundColor: surface }]}
          onPress={pickPhoto}
          accessibilityRole="button"
          accessibilityLabel="Add photo"
        >
          <View style={[styles.mediaIcon, { backgroundColor: isDark ? colors.dark.surfaceMuted : colors.light.surfaceMuted }]}>
            <Ionicons name="image-outline" size={24} color={text} />
          </View>
          <View style={styles.mediaBody}>
            <Text style={[styles.mediaTitle, { color: text }]}>
              {draft.photoUri ? (draft.photoName ?? "Photo added") : "Add Photo"}
            </Text>
            <Text style={[styles.mediaHint, { color: secondary }]}>
              Custom artwork · optional
            </Text>
          </View>
          <Ionicons name={draft.photoUri ? "checkmark-circle" : "add"} size={22} color={secondary} />
        </Pressable>

        <Text style={[styles.sectionLabel, { color: secondary }]}>Event Details</Text>

        <View style={[styles.formGroup, { backgroundColor: surface }]}>
          <View style={[styles.formRow, { borderBottomColor: border }]}>
            <Text style={[styles.fieldLabel, { color: text }]}>Event Name</Text>
            <TextInput
              style={[styles.fieldInput, { color: text }]}
              placeholder="Title of your show"
              placeholderTextColor={secondary}
              value={draft.eventName ?? ""}
              onChangeText={(eventName) => mergeDraft({ eventName })}
              returnKeyType="next"
            />
          </View>
          <Pressable
            style={[styles.formRow, { borderBottomColor: border }]}
            onPress={() => setDatePickerVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Select date"
          >
            <Text style={[styles.fieldLabel, { color: text }]}>Date</Text>
            <Text style={[styles.fieldValue, { color: draft.eventDate ? text : secondary }]}>
              {formatDisplayDate(draft.eventDate) || "Select date"}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.formRow, { borderBottomColor: border }]}
            onPress={() => setStartTimePickerVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Select start time"
          >
            <Text style={[styles.fieldLabel, { color: text }]}>Start Time</Text>
            <Text style={[styles.fieldValue, { color: draft.eventTime ? text : secondary }]}>
              {formatTimeDisplay(draft.eventTime) || "Select time"}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.formRow, { borderBottomColor: border }]}
            onPress={() => setEndTimePickerVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Select end time"
          >
            <Text style={[styles.fieldLabel, { color: text }]}>End Time</Text>
            <Text
              style={[
                styles.fieldValue,
                { color: draft.eventEndTime ? text : secondary },
              ]}
            >
              {formatTimeDisplay(draft.eventEndTime) || "Optional"}
            </Text>
          </Pressable>
          <View style={[styles.formRow, { borderBottomColor: border }]}>
            <Text style={[styles.fieldLabel, { color: text }]}>Venue</Text>
            <TextInput
              style={[styles.fieldInput, { color: text }]}
              placeholder="Where it's at"
              placeholderTextColor={secondary}
              value={draft.venue ?? ""}
              onChangeText={(venue) => mergeDraft({ venue })}
            />
          </View>
          <View style={styles.formRow}>
            <Text style={[styles.fieldLabel, { color: text }]}>City</Text>
            <TextInput
              style={[styles.fieldInput, { color: text }]}
              placeholder="City, state"
              placeholderTextColor={secondary}
              value={draft.city ?? ""}
              onChangeText={(city) => mergeDraft({ city })}
            />
          </View>
        </View>

        <Text style={[styles.hint, { color: secondary }]}>
          You can pick a template and customize colors and lineup on the next screen.
        </Text>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { borderTopColor: border, paddingBottom: insets.bottom + spacing.sm },
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.footerNextButton,
            { backgroundColor: text },
            !canAdvance && styles.footerNextButtonDisabled,
            pressed && canAdvance && styles.pressed,
          ]}
          onPress={() => void handleNext()}
          disabled={!canAdvance || isSaving}
          accessibilityRole="button"
          accessibilityLabel="Next step"
          accessibilityState={{ disabled: !canAdvance || isSaving }}
        >
          <Text
            style={[
              styles.footerNextButtonText,
              { color: canAdvance ? bg : secondary },
            ]}
          >
            Next
          </Text>
          <Ionicons
            name="arrow-forward"
            size={18}
            color={canAdvance ? bg : secondary}
          />
        </Pressable>
      </View>

      <ReleaseDatePickerModal
        visible={datePickerVisible}
        value={eventDateValue}
        onConfirm={(date) => {
          mergeDraft({ eventDate: date.toISOString() });
          setDatePickerVisible(false);
        }}
        onClear={() => {
          mergeDraft({ eventDate: undefined });
          setDatePickerVisible(false);
        }}
        onDismiss={() => setDatePickerVisible(false)}
      />

      <EventTimePickerModal
        visible={startTimePickerVisible}
        value={draft.eventTime ?? null}
        title="Start Time"
        onConfirm={(eventTime) => {
          mergeDraft({ eventTime });
          setStartTimePickerVisible(false);
        }}
        onDismiss={() => setStartTimePickerVisible(false)}
      />

      <EventTimePickerModal
        visible={endTimePickerVisible}
        value={draft.eventEndTime ?? null}
        title="End Time"
        allowClear
        onConfirm={(eventEndTime) => {
          mergeDraft({ eventEndTime });
          setEndTimePickerVisible(false);
        }}
        onClear={() => {
          mergeDraft({ eventEndTime: "" });
          setEndTimePickerVisible(false);
        }}
        onDismiss={() => setEndTimePickerVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerNextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  footerNextButtonDisabled: {
    opacity: 0.3,
  },
  footerNextButtonText: {
    ...typography.button,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.985 }],
  },
  scroll: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  mediaCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md + 4,
    borderRadius: radius.lg,
  },
  mediaIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaBody: { flex: 1, gap: 2 },
  mediaTitle: { fontSize: 16, fontWeight: "600" },
  mediaHint: { fontSize: 13 },
  sectionLabel: {
    ...typography.caption,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    paddingHorizontal: 4,
  },
  formGroup: {
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  formRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: "500",
    flexShrink: 0,
  },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    textAlign: "right",
  },
  fieldValue: {
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 4,
    marginTop: spacing.xs,
  },
});
