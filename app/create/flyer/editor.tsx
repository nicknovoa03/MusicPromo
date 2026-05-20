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
import { FlyerTemplateView } from "@/components/flyer/FlyerTemplateView";
import {
  FlyerEditorTabs,
  type FlyerEditorTab,
} from "@/components/flyer/FlyerEditorTabs";
import { useFlyerDraft } from "@/providers/FlyerDraftContext";
import { useFlyerScreenParams } from "@/hooks/useFlyerScreenParams";
import { useFlyerClose } from "@/hooks/useFlyerClose";
import { previewSize } from "@/lib/flyerDimensions";
import type { FlyerLineup, FlyerTemplateId } from "@/lib/flyerDraft";
import { defaultFlyerLineup, parseFlyerLineup } from "@/lib/flyerDraft";
import {
  FLYER_ACCENT_SWATCHES,
  FLYER_BACKGROUND_PRESETS,
  FLYER_TEMPLATE_OPTIONS,
} from "@/lib/flyerTemplates";

export default function FlyerEditorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useFlyerScreenParams("editor");
  const { draft, mergeDraft, getNavigationParams } = useFlyerDraft();
  const { handleClose, saveAndContinue, isSaving } = useFlyerClose({
    step: "editor",
    getFlushPatch: () => ({ step: "export" }),
  });
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

  const aspectRatio = draft.aspectRatio ?? "9:16";
  const templateId = draft.templateId ?? "heat";
  const preview = useMemo(
    () => previewSize(aspectRatio, 220),
    [aspectRatio],
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
      <View style={styles.header}>
        <Pressable
          onPress={handleClose}
          disabled={isSaving}
          accessibilityRole="button"
          accessibilityLabel="Save and exit"
        >
          <Ionicons name="close" size={28} color={colors.dark.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {draft.eventName?.trim() || "Event Flyer"}
        </Text>
        <Pressable
          style={styles.exportButton}
          onPress={() => void handleExport()}
          disabled={isSaving}
          accessibilityRole="button"
          accessibilityLabel="Export"
        >
          <Text style={styles.exportButtonText}>Export</Text>
        </Pressable>
      </View>

      <View style={styles.previewArea}>
        <View style={styles.aspectBadge}>
          <Text style={styles.aspectBadgeText}>{aspectRatio}</Text>
        </View>
        <View
          style={[
            styles.previewFrame,
            { width: preview.width, height: preview.height },
          ]}
        >
          <FlyerTemplateView draft={draft} templateId={templateId} />
        </View>
      </View>

      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
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
                label="Eyebrow"
                value={draft.eyebrow ?? ""}
                onChange={(eyebrow) => mergeDraft({ eyebrow })}
                placeholder="ROOFTOP DAY PARTY"
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

          {activeTab === "fonts" ? (
            <View style={styles.panel}>
              <Text style={styles.fontsCopy}>
                Fonts are set by the template. Switch templates to change the display style.
              </Text>
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

        <View style={styles.aspectRow}>
          {(["9:16", "4:5"] as const).map((ratio) => {
            const active = aspectRatio === ratio;
            return (
              <Pressable
                key={ratio}
                style={[styles.aspectButton, active && styles.aspectButtonActive]}
                onPress={() => mergeDraft({ aspectRatio: ratio })}
              >
                <Text
                  style={[
                    styles.aspectButtonText,
                    active && styles.aspectButtonTextActive,
                  ]}
                >
                  {ratio === "9:16" ? "9:16 Story" : "4:5 Post"}
                </Text>
              </Pressable>
            );
          })}
        </View>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "500",
    color: colors.dark.textSecondary,
    marginHorizontal: spacing.sm,
  },
  exportButton: {
    backgroundColor: colors.dark.text,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  exportButtonText: {
    color: colors.dark.background,
    fontSize: 15,
    fontWeight: "600",
  },
  previewArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  aspectBadge: {
    position: "absolute",
    top: 0,
    right: spacing.lg,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  aspectBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.dark.text,
    letterSpacing: 0.5,
  },
  previewFrame: {
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: "#111",
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
  fontsCopy: {
    fontSize: 14,
    color: colors.dark.textSecondary,
    lineHeight: 20,
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
  aspectRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  aspectButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: "center",
    backgroundColor: colors.dark.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dark.border,
  },
  aspectButtonActive: {
    backgroundColor: colors.dark.text,
    borderColor: colors.dark.text,
  },
  aspectButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.dark.text,
  },
  aspectButtonTextActive: {
    color: colors.dark.background,
  },
});
