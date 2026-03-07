import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
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
  const { height: windowHeight } = useWindowDimensions();
  const [draftAspectRatio, setDraftAspectRatio] = useState<AspectRatio>(aspectRatio);
  const [draftTemplateId, setDraftTemplateId] = useState(templateId);
  const draftTemplateIdRef = useRef(templateId);
  const sheetTranslateY = useRef(new Animated.Value(0)).current;
  const dragStartOffsetRef = useRef(0);
  const isClosingFromSwipeRef = useRef(false);
  const closeRequestedRef = useRef(false);
  const closeAnimationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;
    setDraftAspectRatio(aspectRatio);
    setDraftTemplateId(templateId);
    draftTemplateIdRef.current = templateId;
    isClosingFromSwipeRef.current = false;
    closeRequestedRef.current = false;
    if (closeAnimationTimerRef.current) {
      clearTimeout(closeAnimationTimerRef.current);
      closeAnimationTimerRef.current = null;
    }
    dragStartOffsetRef.current = 0;
    sheetTranslateY.setValue(windowHeight);
    Animated.timing(sheetTranslateY, {
      toValue: 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [aspectRatio, templateId, visible, sheetTranslateY, windowHeight]);

  useEffect(
    () => () => {
      if (closeAnimationTimerRef.current) {
        clearTimeout(closeAnimationTimerRef.current);
        closeAnimationTimerRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    draftTemplateIdRef.current = draftTemplateId;
  }, [draftTemplateId]);

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
      if (nextTemplateId === draftTemplateIdRef.current) return;
      draftTemplateIdRef.current = nextTemplateId;
      setDraftTemplateId(nextTemplateId);
      onTemplateSelectionChanged?.(nextTemplateId);
    },
    [onTemplateSelectionChanged],
  );

  const animateSheetBackToRest = useCallback(() => {
    Animated.timing(sheetTranslateY, {
      toValue: 0,
      duration: 150,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [sheetTranslateY]);

  const requestCloseOnce = useCallback(() => {
    if (closeRequestedRef.current) return;
    closeRequestedRef.current = true;
    isClosingFromSwipeRef.current = false;
    dragStartOffsetRef.current = 0;
    if (closeAnimationTimerRef.current) {
      clearTimeout(closeAnimationTimerRef.current);
      closeAnimationTimerRef.current = null;
    }
    onClose();
  }, [onClose]);

  const closeFromSwipe = useCallback(() => {
    if (isClosingFromSwipeRef.current || closeRequestedRef.current) return;
    isClosingFromSwipeRef.current = true;
    dragStartOffsetRef.current = 0;
    sheetTranslateY.stopAnimation();
    if (closeAnimationTimerRef.current) {
      clearTimeout(closeAnimationTimerRef.current);
    }
    closeAnimationTimerRef.current = setTimeout(() => {
      requestCloseOnce();
    }, 220);
    Animated.timing(sheetTranslateY, {
      toValue: windowHeight + 56,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      requestCloseOnce();
    });
  }, [requestCloseOnce, sheetTranslateY, windowHeight]);

  const headerPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () =>
          !isClosingFromSwipeRef.current && !closeRequestedRef.current,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          !isClosingFromSwipeRef.current &&
          gestureState.dy > 0 &&
          Math.abs(gestureState.dy) >= Math.abs(gestureState.dx),
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          !isClosingFromSwipeRef.current &&
          gestureState.dy > 0 &&
          Math.abs(gestureState.dy) >= Math.abs(gestureState.dx),
        onPanResponderGrant: () => {
          if (isClosingFromSwipeRef.current || closeRequestedRef.current) return;
          sheetTranslateY.stopAnimation((currentValue) => {
            dragStartOffsetRef.current = Number.isFinite(currentValue)
              ? Math.max(0, currentValue)
              : 0;
          });
        },
        onPanResponderMove: (_, gestureState) => {
          if (isClosingFromSwipeRef.current || closeRequestedRef.current) return;
          if (gestureState.dy <= 0 && dragStartOffsetRef.current <= 0) return;
          const nextOffset = Math.max(
            0,
            Math.min(windowHeight, dragStartOffsetRef.current + gestureState.dy),
          );
          sheetTranslateY.setValue(nextOffset);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (isClosingFromSwipeRef.current || closeRequestedRef.current) return;
          const draggedDistance = dragStartOffsetRef.current + gestureState.dy;
          const shouldDismiss = draggedDistance > 12 || gestureState.vy > 0.12;
          dragStartOffsetRef.current = 0;
          if (shouldDismiss) {
            closeFromSwipe();
            return;
          }
          animateSheetBackToRest();
        },
        onPanResponderTerminate: () => {
          if (isClosingFromSwipeRef.current || closeRequestedRef.current) return;
          sheetTranslateY.stopAnimation((currentValue) => {
            dragStartOffsetRef.current = 0;
            if (currentValue > 2) {
              closeFromSwipe();
              return;
            }
            animateSheetBackToRest();
          });
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [animateSheetBackToRest, closeFromSwipe, sheetTranslateY, windowHeight],
  );

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={closeFromSwipe}
    >
      <View style={styles.root}>
        <Pressable
          style={styles.backdrop}
          onPress={closeFromSwipe}
          accessibilityLabel="Close edit template"
          accessibilityRole="button"
        />

        <Animated.View
          style={[
            styles.sheetMask,
            {
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          <View style={styles.sheet}>
            <View style={styles.topChrome} {...headerPanResponder.panHandlers}>
              <View style={styles.headerGlassBand} pointerEvents="none" />
              <View style={styles.dragHandleWrap}>
                <View style={styles.dragHandle} />
              </View>

              <View style={styles.header}>
                <Text style={styles.headerTitle}>Edit Template</Text>
              </View>
            </View>

            <View style={styles.content}>
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
              </View>
            </View>

            <View style={styles.footer}>
              <Pressable
                onPress={() =>
                  onApply({
                    aspectRatio: draftAspectRatio,
                    templateId: draftTemplateId,
                  })
                }
                style={styles.applyButton}
                accessibilityLabel={`Apply template changes for ${selectedTemplate?.name ?? "template"}`}
                accessibilityRole="button"
              >
                <Text style={styles.applyButtonText}>Apply Changes</Text>
              </Pressable>
            </View>
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
    backgroundColor: "transparent",
  },
  sheetMask: {
    maxHeight: "62%",
    minHeight: 360,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: "#0B0D14",
  },
  sheet: {
    backgroundColor: "#0B0D14",
  },
  topChrome: {
    position: "relative",
    backgroundColor: "#0B0D14",
  },
  headerGlassBand: {
    ...StyleSheet.absoluteFillObject,
    top: 0,
    height: 62,
    backgroundColor: "transparent",
    borderBottomWidth: 0,
    borderBottomColor: "transparent",
  },
  dragHandleWrap: {
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  dragHandle: {
    width: 42,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.06)",
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
    paddingTop: spacing.md,
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
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
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
