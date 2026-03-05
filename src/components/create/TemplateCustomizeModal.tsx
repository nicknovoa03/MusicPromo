import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, radius, spacing, typography } from "@/constants/tokens";
import { VinylPreview } from "@/components/create/VinylPreview";
import type { TemplateTweaks } from "@/lib/templates";
import type { VinylToneId } from "@/lib/vinylTemplateSpec";

interface TemplateCustomizeModalProps {
  visible: boolean;
  templateId: string;
  photoUri?: string | null;
  value: TemplateTweaks;
  onClose: () => void;
  onApply: (next: TemplateTweaks) => void;
}

interface BackgroundOption {
  id: string;
  label: string;
  color: string | null;
  swatch: string;
}

const SPIN_SPEED_OPTIONS = [0.6, 0.8, 1, 1.25, 1.5];
const RECORD_OPACITY_OPTIONS = [0.55, 0.7, 0.85, 1];
const BACKGROUND_OPTIONS: BackgroundOption[] = [
  { id: "default", label: "Default", color: null, swatch: "#080A12" },
  { id: "indigo", label: "Indigo", color: "#14142d", swatch: "#35357a" },
  { id: "midnight", label: "Midnight", color: "#0a0f1c", swatch: "#1d2f58" },
  { id: "charcoal", label: "Charcoal", color: "#111114", swatch: "#37373e" },
  { id: "sunset", label: "Sunset", color: "#211121", swatch: "#8f3f7d" },
];

function formatSpeed(value: number): string {
  return `${value.toFixed(value % 1 === 0 ? 0 : 2)}x`;
}

function formatOpacity(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function resolveTone(templateId: string): VinylToneId {
  return templateId === "graphic-pop" ? "graphic-pop" : "simple-spin";
}

async function triggerSelectionHaptic() {
  try {
    if (Platform.OS === "android") {
      await Haptics.performAndroidHapticsAsync(
        Haptics.AndroidHaptics.Segment_Tick,
      );
      return;
    }
    await Haptics.selectionAsync();
  } catch {
    // Ignore unsupported haptic failures.
  }
}

export function TemplateCustomizeModal({
  visible,
  templateId,
  photoUri,
  value,
  onClose,
  onApply,
}: TemplateCustomizeModalProps) {
  const [draft, setDraft] = useState<TemplateTweaks>(value);

  useEffect(() => {
    if (!visible) return;
    setDraft(value);
  }, [value, visible]);

  const selectedBackground = useMemo(
    () =>
      BACKGROUND_OPTIONS.find((option) => option.color === draft.stageBackgroundColor) ??
      BACKGROUND_OPTIONS[0],
    [draft.stageBackgroundColor],
  );

  const updateSpinSpeed = useCallback((spinSpeed: number) => {
    if (spinSpeed === draft.spinSpeed) return;
    setDraft((prev) => ({ ...prev, spinSpeed }));
    void triggerSelectionHaptic();
  }, [draft.spinSpeed]);

  const updateRecordOpacity = useCallback((recordOpacity: number) => {
    if (recordOpacity === draft.recordOpacity) return;
    setDraft((prev) => ({ ...prev, recordOpacity }));
    void triggerSelectionHaptic();
  }, [draft.recordOpacity]);

  const updateBackground = useCallback((stageBackgroundColor: string | null) => {
    if (stageBackgroundColor === draft.stageBackgroundColor) return;
    setDraft((prev) => ({ ...prev, stageBackgroundColor }));
    void triggerSelectionHaptic();
  }, [draft.stageBackgroundColor]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      allowSwipeDismissal
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Template Controls</Text>
          <Pressable
            onPress={onClose}
            style={styles.headerClose}
            accessibilityLabel="Close template controls"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={18} color={colors.dark.text} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.previewCard,
              {
                backgroundColor: draft.stageBackgroundColor ?? "#080a12",
              },
            ]}
          >
            <VinylPreview
              imageUri={photoUri ?? null}
              size={210}
              spinning
              spinSpeed={draft.spinSpeed}
              discOpacity={draft.recordOpacity}
              tone={resolveTone(templateId)}
            />
          </View>

          <View style={styles.controlSection}>
            <View style={styles.controlHeader}>
              <Text style={styles.controlLabel}>Spin Speed</Text>
              <Text style={styles.controlValue}>{formatSpeed(draft.spinSpeed)}</Text>
            </View>
            <View style={styles.optionRow}>
              {SPIN_SPEED_OPTIONS.map((option) => {
                const selected = option === draft.spinSpeed;
                return (
                  <Pressable
                    key={String(option)}
                    onPress={() => updateSpinSpeed(option)}
                    style={[styles.optionPill, selected && styles.optionPillSelected]}
                    accessibilityLabel={`Spin speed ${formatSpeed(option)}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Text
                      style={[
                        styles.optionPillText,
                        selected && styles.optionPillTextSelected,
                      ]}
                    >
                      {formatSpeed(option)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.controlSection}>
            <View style={styles.controlHeader}>
              <Text style={styles.controlLabel}>Record Opacity</Text>
              <Text style={styles.controlValue}>
                {formatOpacity(draft.recordOpacity)}
              </Text>
            </View>
            <View style={styles.optionRow}>
              {RECORD_OPACITY_OPTIONS.map((option) => {
                const selected = option === draft.recordOpacity;
                return (
                  <Pressable
                    key={String(option)}
                    onPress={() => updateRecordOpacity(option)}
                    style={[styles.optionPill, selected && styles.optionPillSelected]}
                    accessibilityLabel={`Record opacity ${formatOpacity(option)}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Text
                      style={[
                        styles.optionPillText,
                        selected && styles.optionPillTextSelected,
                      ]}
                    >
                      {formatOpacity(option)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.controlSection}>
            <View style={styles.controlHeader}>
              <Text style={styles.controlLabel}>Background</Text>
              <Text style={styles.controlValue}>{selectedBackground.label}</Text>
            </View>
            <View style={styles.backgroundRow}>
              {BACKGROUND_OPTIONS.map((option) => {
                const selected = option.color === draft.stageBackgroundColor;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => updateBackground(option.color)}
                    style={[
                      styles.backgroundSwatchWrap,
                      selected && styles.backgroundSwatchWrapSelected,
                    ]}
                    accessibilityLabel={`Background ${option.label}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <View
                      style={[
                        styles.backgroundSwatch,
                        { backgroundColor: option.swatch },
                      ]}
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={() => onApply(draft)}
            style={styles.applyButton}
            accessibilityLabel="Apply template controls"
            accessibilityRole="button"
          >
            <Text style={styles.applyButtonText}>Apply Changes</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    ...typography.body,
    color: colors.dark.text,
    fontWeight: "700",
  },
  headerClose: {
    position: "absolute",
    right: spacing.lg,
    top: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  previewCard: {
    minHeight: 300,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  controlSection: {
    gap: spacing.sm,
  },
  controlHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  controlLabel: {
    ...typography.caption,
    color: colors.dark.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontWeight: "700",
  },
  controlValue: {
    ...typography.caption,
    color: colors.dark.text,
    fontWeight: "700",
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  optionPill: {
    minHeight: 34,
    minWidth: 64,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
    backgroundColor: colors.dark.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  optionPillSelected: {
    borderColor: colors.accent.primary,
    backgroundColor: colors.accent.primary,
  },
  optionPillText: {
    ...typography.caption,
    color: colors.dark.textSecondary,
    fontWeight: "700",
  },
  optionPillTextSelected: {
    color: colors.dark.text,
  },
  backgroundRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  backgroundSwatchWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  backgroundSwatchWrapSelected: {
    borderColor: colors.accent.primary,
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
  },
  backgroundSwatch: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  applyButton: {
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.accent.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  applyButtonText: {
    ...typography.button,
    color: colors.dark.text,
    fontWeight: "700",
  },
});
