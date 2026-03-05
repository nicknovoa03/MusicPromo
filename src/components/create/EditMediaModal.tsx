import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, radius, spacing, typography } from "@/constants/tokens";
import { TemplateSwitcher } from "@/components/create/TemplateSwitcher";
import type { AspectRatio } from "@/components/create/AspectRatioToggle";
import type { TemplateDefinition } from "@/lib/templates";

interface EditMediaModalProps {
  visible: boolean;
  aspectRatio: AspectRatio;
  templateId: string;
  templateDefinitions: TemplateDefinition[];
  onClose: () => void;
  onApply: (next: { aspectRatio: AspectRatio; templateId: string }) => void;
  onSwapPhoto: () => void;
  onSwapAudio: () => void;
  onTemplateSelectionChanged?: (nextTemplateId: string) => void;
  photoLabel: string;
  audioLabel: string;
}

const ASPECT_OPTIONS: AspectRatio[] = ["9:16", "1:1"];

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

export function EditMediaModal({
  visible,
  aspectRatio,
  templateId,
  templateDefinitions,
  onClose,
  onApply,
  onSwapPhoto,
  onSwapAudio,
  onTemplateSelectionChanged,
  photoLabel,
  audioLabel,
}: EditMediaModalProps) {
  const [draftAspectRatio, setDraftAspectRatio] = useState<AspectRatio>(aspectRatio);
  const [draftTemplateId, setDraftTemplateId] = useState(templateId);
  const sheetTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    setDraftAspectRatio(aspectRatio);
    setDraftTemplateId(templateId);
    sheetTranslateY.setValue(0);
  }, [aspectRatio, sheetTranslateY, templateId, visible]);

  const selectedTemplate = useMemo(
    () =>
      templateDefinitions.find((option) => option.id === draftTemplateId) ??
      templateDefinitions[0],
    [draftTemplateId, templateDefinitions],
  );

  const handleAspectRatioSelect = useCallback(
    (nextAspectRatio: AspectRatio) => {
      if (nextAspectRatio === draftAspectRatio) return;
      setDraftAspectRatio(nextAspectRatio);
      void triggerSelectionHaptic();
    },
    [draftAspectRatio],
  );

  const handleTemplateSelect = useCallback(
    (nextTemplateId: string) => {
      if (nextTemplateId === draftTemplateId) return;
      setDraftTemplateId(nextTemplateId);
      onTemplateSelectionChanged?.(nextTemplateId);
    },
    [draftTemplateId, onTemplateSelectionChanged],
  );

  const sheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > 6 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy <= 0) return;
          sheetTranslateY.setValue(gestureState.dy);
        },
        onPanResponderRelease: (_, gestureState) => {
          const shouldDismiss = gestureState.dy > 96 || gestureState.vy > 1.15;
          if (shouldDismiss) {
            sheetTranslateY.setValue(0);
            onClose();
            return;
          }
          Animated.spring(sheetTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
            speed: 20,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(sheetTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
            speed: 20,
          }).start();
        },
      }),
    [onClose, sheetTranslateY],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityLabel="Close edit media"
          accessibilityRole="button"
        />

        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          <View style={styles.dragHandleWrap} {...sheetPanResponder.panHandlers}>
            <View style={styles.dragHandle} />
          </View>

          <View style={styles.header}>
          <Text style={styles.headerTitle}>Edit Media</Text>
          <Pressable
            onPress={onClose}
            style={styles.headerClose}
            accessibilityLabel="Close edit media"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={18} color={colors.dark.text} />
          </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
            <Text style={styles.sectionLabel}>Aspect Ratio</Text>
            <View style={styles.aspectRow}>
              {ASPECT_OPTIONS.map((option) => {
                const selected = option === draftAspectRatio;
                return (
                  <Pressable
                    key={option}
                    onPress={() => handleAspectRatioSelect(option)}
                    style={[styles.optionPill, selected && styles.optionPillSelected]}
                    accessibilityLabel={`Aspect ratio ${option}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Ionicons
                      name="crop"
                      size={14}
                      color={selected ? colors.dark.text : colors.dark.textSecondary}
                    />
                    <Text
                      style={[
                        styles.optionPillText,
                        selected && styles.optionPillTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            </View>

            <View style={styles.section}>
            <View style={styles.templateHeader}>
              <Text style={styles.sectionLabel}>Template</Text>
              <Text style={styles.templateMeta}>
                {selectedTemplate?.name ?? "Template"}
              </Text>
            </View>
            <TemplateSwitcher
              options={templateDefinitions}
              value={draftTemplateId}
              onChange={handleTemplateSelect}
            />
            </View>

            <View style={styles.section}>
            <Text style={styles.sectionLabel}>Audio & Video</Text>
            <Pressable
              onPress={onSwapPhoto}
              style={styles.actionRow}
              accessibilityLabel="Change photo"
              accessibilityRole="button"
            >
              <View style={styles.actionLeft}>
                <Ionicons name="camera-outline" size={18} color={colors.accent.primary} />
                <View style={styles.actionTextWrap}>
                  <Text style={styles.actionTitle}>Change Photo</Text>
                  <Text style={styles.actionMeta} numberOfLines={1}>
                    {photoLabel || "Current image"}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.dark.textSecondary} />
            </Pressable>
            <Pressable
              onPress={onSwapAudio}
              style={styles.actionRow}
              accessibilityLabel="Change audio"
              accessibilityRole="button"
            >
              <View style={styles.actionLeft}>
                <Ionicons
                  name="musical-notes-outline"
                  size={18}
                  color={colors.accent.primary}
                />
                <View style={styles.actionTextWrap}>
                  <Text style={styles.actionTitle}>Change Audio Track</Text>
                  <Text style={styles.actionMeta} numberOfLines={1}>
                    {audioLabel || "Current audio"}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.dark.textSecondary} />
            </Pressable>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              onPress={() =>
                onApply({
                  aspectRatio: draftAspectRatio,
                  templateId: draftTemplateId,
                })
              }
              style={styles.applyButton}
              accessibilityLabel={`Apply media changes for ${selectedTemplate?.name ?? "template"}`}
              accessibilityRole="button"
            >
              <Text style={styles.applyButtonText}>Apply Changes</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    maxHeight: "64%",
    minHeight: 380,
    backgroundColor: colors.dark.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  dragHandleWrap: {
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
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
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.dark.textSecondary,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.45,
  },
  templateHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  templateMeta: {
    ...typography.caption,
    color: colors.dark.text,
    fontWeight: "700",
  },
  aspectRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  optionPill: {
    minHeight: 34,
    minWidth: 74,
    borderRadius: radius.full,
    backgroundColor: colors.dark.surface,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
    paddingHorizontal: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
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
  actionRow: {
    minHeight: 56,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  actionTextWrap: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    ...typography.body,
    color: colors.dark.text,
    fontSize: 15,
    fontWeight: "600",
  },
  actionMeta: {
    ...typography.caption,
    color: colors.dark.textSecondary,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.35,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
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
