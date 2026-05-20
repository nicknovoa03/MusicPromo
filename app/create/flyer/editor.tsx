import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av";
import { colors, spacing, radius } from "@/constants/tokens";
import { AudioTrimmer } from "@/components/create/AudioTrimmer";
import { FlyerLineupEditor } from "@/components/flyer/FlyerLineupEditor";
import { FlyerPreviewFrame } from "@/components/flyer/FlyerPreviewFrame";
import { FLYER_PREVIEW_MAX_WIDTH_EDITOR } from "@/lib/flyerDimensions";
import { FlyerEditorTabs,
  type FlyerEditorTab,
} from "@/components/flyer/FlyerEditorTabs";
import { FlyerFlowHeader } from "@/components/flyer/FlyerFlowHeader";
import { useFlyerDraft } from "@/providers/FlyerDraftContext";
import { useFlyerScreenParams } from "@/hooks/useFlyerScreenParams";
import { useFlyerClose } from "@/hooks/useFlyerClose";
import { useFlyerWizardBack } from "@/hooks/useFlyerWizardBack";
import type { FlyerLineup, FlyerTemplateId } from "@/lib/flyerDraft";
import { defaultFlyerLineup, getFlyerStepLabel, parseFlyerLineup } from "@/lib/flyerDraft";
import {
  FLYER_ACCENT_SWATCHES,
  FLYER_BACKGROUND_PRESETS,
  FLYER_EYEBROW_FIELD,
  FLYER_TEMPLATE_OPTIONS,
} from "@/lib/flyerTemplates";

export default function FlyerEditorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useFlyerScreenParams("editor");
  const { draft, mergeDraft, getNavigationParams, isExistingProject } = useFlyerDraft();
  const { handleClose, saveAndContinue, isSaving } = useFlyerClose({
    step: "editor",
    persistStatus: isExistingProject ? "exported" : "draft",
    getFlushPatch: () => ({ step: "export" }),
  });
  const { goBackOneStep, canStepBack } = useFlyerWizardBack("editor");
  const [activeTab, setActiveTab] = useState<FlyerEditorTab>("colors");
  const [audioDurationSec, setAudioDurationSec] = useState(180);

  const lineup = useMemo(
    () => parseFlyerLineup(draft.lineupJson) ?? defaultFlyerLineup(),
    [draft.lineupJson],
  );

  const trimStart = draft.trimStart ?? 0;
  const trimEnd = draft.trimEnd ?? Math.min(trimStart + 10, audioDurationSec);

  useEffect(() => {
    const uri = draft.audioUri;
    if (!uri) return;
    let sound: Audio.Sound | null = null;
    void (async () => {
      try {
        const { sound: loaded, status } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: false },
        );
        sound = loaded;
        if (status.isLoaded && status.durationMillis) {
          const duration = status.durationMillis / 1000;
          setAudioDurationSec(duration);
          if (draft.trimEnd == null || draft.trimEnd > duration) {
            mergeDraft({
              trimEnd: Math.min(trimStart + 10, duration),
            });
          }
        }
      } catch {
        // Keep default duration fallback.
      }
    })();
    return () => {
      void sound?.unloadAsync();
    };
  }, [draft.audioUri, draft.trimEnd, mergeDraft, trimStart]);

  const templateId = draft.templateId ?? "heat";
  const eyebrowField = FLYER_EYEBROW_FIELD[templateId];

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
      trimEnd: 10,
    });
  }, [mergeDraft]);

  const handleExport = useCallback(async () => {
    await saveAndContinue();
    router.push({
      pathname: "/create/flyer/export",
      params: getNavigationParams("export"),
    } as any);
  }, [getNavigationParams, router, saveAndContinue]);

  const backgroundPresets = FLYER_BACKGROUND_PRESETS[templateId];

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <FlyerFlowHeader
        title={draft.eventName?.trim() || "Event Flyer"}
        stepLabel={getFlyerStepLabel("editor")}
        showBackButton={canStepBack}
        onBack={goBackOneStep}
        onExit={handleClose}
        isSaving={isSaving}
      />

      <View style={styles.previewArea}>
        <FlyerPreviewFrame
          draft={draft}
          templateId={templateId}
          maxWidth={FLYER_PREVIEW_MAX_WIDTH_EDITOR}
          borderRadius={radius.md}
        />
      </View>

      <View style={[styles.sheet, { paddingBottom: spacing.md }]}>
        <Text style={styles.sheetSectionLabel}>Template</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.templateRail}
        >
          {FLYER_TEMPLATE_OPTIONS.map((tpl) => {
            const active = tpl.id === templateId;
            return (
              <Pressable
                key={tpl.id}
                style={[
                  styles.templatePill,
                  active && styles.templatePillActive,
                ]}
                onPress={() =>
                  mergeDraft({
                    templateId: tpl.id as FlyerTemplateId,
                    backgroundKey: FLYER_BACKGROUND_PRESETS[tpl.id][0]?.id,
                  })
                }
              >
                <Text
                  style={[
                    styles.templatePillText,
                    active && styles.templatePillTextActive,
                  ]}
                >
                  {tpl.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <FlyerEditorTabs active={activeTab} onChange={setActiveTab} />

        <ScrollView
          style={styles.tabContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {activeTab === "text" ? (
            <View style={styles.panel}>
              <Field
                label={eyebrowField.label}
                value={draft.eyebrow ?? ""}
                onChange={(eyebrow) => mergeDraft({ eyebrow })}
                placeholder={eyebrowField.placeholder}
              />
              <Field
                label="Subtitle"
                value={draft.flyerSubtitle ?? ""}
                onChange={(flyerSubtitle) => mergeDraft({ flyerSubtitle })}
                placeholder="highland basement party"
              />
              <Field
                label="Event name"
                value={draft.eventName ?? ""}
                onChange={(eventName) => mergeDraft({ eventName })}
                placeholder="Disco at Dusk"
              />
              <Field
                label="Tagline"
                value={draft.tagline ?? ""}
                onChange={(tagline) => mergeDraft({ tagline })}
                placeholder="house / disco / grooves"
              />
              <Text style={styles.lineupHeading}>Lineup</Text>
              <FlyerLineupEditor
                lineup={lineup}
                onChange={(next: FlyerLineup) =>
                  mergeDraft({ lineupJson: JSON.stringify(next) })
                }
              />
            </View>
          ) : null}

          {activeTab === "colors" ? (
            <View style={styles.panel}>
              <Text style={styles.swatchLabel}>Background</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.swatchRow}>
                {backgroundPresets.map((preset) => {
                  const active = draft.backgroundKey === preset.id;
                  return (
                    <Pressable
                      key={preset.id}
                      style={[
                        styles.bgSwatch,
                        active && styles.swatchActive,
                        {
                          backgroundColor: preset.gradient[0],
                        },
                      ]}
                      onPress={() => mergeDraft({ backgroundKey: preset.id })}
                      accessibilityLabel={preset.label}
                    />
                  );
                })}
              </ScrollView>
              {templateId === "heat" ? (
                <>
                  <Text style={[styles.swatchLabel, { marginTop: spacing.md }]}>
                    Accent
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.swatchRow}>
                    {FLYER_ACCENT_SWATCHES.map((color) => {
                      const active = draft.accentColor === color;
                      return (
                        <Pressable
                          key={color}
                          style={[
                            styles.colorSwatch,
                            { backgroundColor: color },
                            active && styles.swatchActive,
                          ]}
                          onPress={() => mergeDraft({ accentColor: color })}
                        />
                      );
                    })}
                  </ScrollView>
                </>
              ) : null}
            </View>
          ) : null}

          {activeTab === "photo" ? (
            <View style={styles.panel}>
              <Pressable style={styles.actionRow} onPress={pickPhoto}>
                <Ionicons name="image-outline" size={20} color={colors.dark.text} />
                <Text style={styles.actionText}>
                  {draft.photoUri ? "Replace photo" : "Add photo"}
                </Text>
              </Pressable>
              {draft.photoUri ? (
                <Pressable
                  style={styles.actionRow}
                  onPress={() =>
                    mergeDraft({ photoUri: null, photoName: null })
                  }
                >
                  <Ionicons name="trash-outline" size={20} color={colors.dark.textSecondary} />
                  <Text style={[styles.actionText, { color: colors.dark.textSecondary }]}>
                    Remove photo
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {activeTab === "audio" ? (
            <View style={styles.panel}>
              {draft.audioUri ? (
                <>
                  <Text style={styles.audioName}>{draft.audioName}</Text>
                  <Text style={styles.audioHint}>
                    {Math.max(0, trimEnd - trimStart).toFixed(0)} sec selected of{" "}
                    {Math.floor(audioDurationSec)} sec
                  </Text>
                  <AudioTrimmer
                    durationSec={audioDurationSec}
                    startSec={trimStart}
                    endSec={trimEnd}
                    minDuration={3}
                    maxDuration={30}
                    onTrimChange={(start, end) =>
                      mergeDraft({ trimStart: start, trimEnd: end })
                    }
                  />
                </>
              ) : (
                <>
                  <Text style={styles.audioHint}>
                    Add audio for video export (10–30 sec clip).
                  </Text>
                  <Pressable style={styles.actionRow} onPress={pickAudio}>
                    <Ionicons name="musical-note-outline" size={20} color={colors.dark.text} />
                    <Text style={styles.actionText}>Add audio</Text>
                  </Pressable>
                </>
              )}
            </View>
          ) : null}
        </ScrollView>
      </View>

      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + spacing.sm },
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.footerExportButton,
            isSaving && styles.footerExportButtonDisabled,
            pressed && !isSaving && styles.pressed,
          ]}
          onPress={() => void handleExport()}
          disabled={isSaving}
          accessibilityRole="button"
          accessibilityLabel="Export flyer"
        >
          <Text style={styles.footerExportButtonText}>Export</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.accent.onPrimary} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldBlockLabel}>{label}</Text>
      <TextInput
        style={styles.fieldBlockInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.dark.textSecondary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.dark.border,
    backgroundColor: colors.dark.surface,
  },
  footerExportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.accent.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  footerExportButtonDisabled: {
    opacity: 0.3,
  },
  footerExportButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.accent.onPrimary,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.985 }],
  },
  previewArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.dark.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.dark.border,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    maxHeight: "46%",
  },
  sheetSectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.dark.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  templateRail: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  templatePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.surfaceMuted,
  },
  templatePillActive: {
    backgroundColor: colors.dark.text,
    borderColor: colors.dark.text,
  },
  templatePillText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.dark.text,
  },
  templatePillTextActive: {
    color: colors.dark.background,
  },
  tabContent: {
    maxHeight: 200,
  },
  panel: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  swatchLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.dark.textSecondary,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  swatchRow: {
    gap: 10,
    paddingBottom: spacing.xs,
  },
  bgSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.dark.border,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.dark.border,
  },
  swatchActive: {
    borderColor: colors.dark.text,
    borderWidth: 3,
  },
  fieldBlock: { gap: 6 },
  fieldBlockLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.dark.textSecondary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  fieldBlockInput: {
    backgroundColor: colors.dark.surfaceMuted,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.dark.text,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dark.border,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  actionText: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.dark.text,
  },
  audioName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.dark.text,
  },
  audioHint: {
    fontSize: 13,
    color: colors.dark.textSecondary,
    lineHeight: 18,
  },
  lineupHeading: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.dark.textSecondary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: spacing.sm,
  },
});
