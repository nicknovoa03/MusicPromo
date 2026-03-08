import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import * as ExpoSwiftUI from "@expo/ui/swift-ui";
import { colors, radius, spacing, typography } from "@/constants/tokens";
import type { AspectRatio } from "@/components/create/AspectRatioToggle";
import {
  getIOSNativeUIPhase5Availability,
  type ExpoSwiftUIModule,
} from "@/lib/iosNativeUi";
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
const TEMPLATE_CARD_WIDTH = 132;
const TEMPLATE_CARD_HEIGHT = 132;
const TEMPLATE_CARD_GAP = spacing.xs;

function getTemplateIcon(templateId: string): keyof typeof Ionicons.glyphMap {
  if (templateId === "vinyl" || templateId === "simple-spin") return "disc";
  if (templateId === "cd" || templateId === "graphic-pop") return "disc-outline";
  if (templateId === "whole" || templateId === "hybrid") return "ellipse";
  return "shapes-outline";
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
  const [templateCarouselWidth, setTemplateCarouselWidth] = useState(0);
  const templateCarouselRef = useRef<ScrollView>(null);
  const templateScrollX = useRef(new Animated.Value(0)).current;
  const draftTemplateIdRef = useRef(templateId);
  const sheetTranslateY = useRef(new Animated.Value(0)).current;
  const dragStartOffsetRef = useRef(0);
  const isClosingFromSwipeRef = useRef(false);
  const closeRequestedRef = useRef(false);
  const applyCommittedRef = useRef(false);
  const closeAnimationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;
    setDraftAspectRatio(aspectRatio);
    setDraftTemplateId(templateId);
    draftTemplateIdRef.current = templateId;
    isClosingFromSwipeRef.current = false;
    closeRequestedRef.current = false;
    applyCommittedRef.current = false;
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
  const selectedTemplateIndex = useMemo(
    () =>
      Math.max(
        0,
        templateDefinitions.findIndex((option) => option.id === draftTemplateId),
      ),
    [draftTemplateId, templateDefinitions],
  );
  const templateSnapInterval = TEMPLATE_CARD_WIDTH + TEMPLATE_CARD_GAP;
  const templateCarouselSideInset = Math.max(
    (templateCarouselWidth - TEMPLATE_CARD_WIDTH) / 2,
    0,
  );
  const nativeEditTemplateAvailability = getIOSNativeUIPhase5Availability({
    minIOSVersion: 16,
  });
  const nativeEditTemplateEnabledByContract = nativeEditTemplateAvailability.enabled;
  const expoSwiftUI = nativeEditTemplateEnabledByContract
    ? (ExpoSwiftUI as ExpoSwiftUIModule)
    : null;
  const expoSwiftUIAny = expoSwiftUI as Record<string, unknown> | null;
  const hasNativeEditTemplateComponents = Boolean(
    expoSwiftUIAny &&
      "Host" in expoSwiftUIAny &&
      "Form" in expoSwiftUIAny &&
      "Section" in expoSwiftUIAny &&
      "Picker" in expoSwiftUIAny &&
      "Button" in expoSwiftUIAny &&
      "LabeledContent" in expoSwiftUIAny &&
      "Text" in expoSwiftUIAny,
  );
  const canUseNativeEditTemplateControls =
    false &&
    nativeEditTemplateEnabledByContract &&
    expoSwiftUI !== null &&
    hasNativeEditTemplateComponents;

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
      void triggerSelectionHaptic();
      onTemplateSelectionChanged?.(nextTemplateId);
    },
    [onTemplateSelectionChanged],
  );

  const scrollTemplateToIndex = useCallback(
    (index: number, animated: boolean) => {
      if (!templateDefinitions.length) return;
      const clampedIndex = Math.max(0, Math.min(index, templateDefinitions.length - 1));
      templateCarouselRef.current?.scrollTo({
        x: clampedIndex * templateSnapInterval,
        y: 0,
        animated,
      });
    },
    [templateDefinitions.length, templateSnapInterval],
  );

  const settleTemplateCarousel = useCallback(
    (offsetX: number) => {
      if (!templateDefinitions.length) return;
      const centeredIndex = Math.max(
        0,
        Math.min(
          templateDefinitions.length - 1,
          Math.round(offsetX / templateSnapInterval),
        ),
      );
      const nextTemplate = templateDefinitions[centeredIndex];
      if (!nextTemplate) return;
      handleTemplateSelect(nextTemplate.id);
      scrollTemplateToIndex(centeredIndex, true);
    },
    [handleTemplateSelect, scrollTemplateToIndex, templateDefinitions, templateSnapInterval],
  );

  const handleTemplateCarouselLayout = useCallback((event: LayoutChangeEvent) => {
    setTemplateCarouselWidth(event.nativeEvent.layout.width);
  }, []);

  const handleTemplateMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      settleTemplateCarousel(event.nativeEvent.contentOffset.x);
    },
    [settleTemplateCarousel],
  );

  useEffect(() => {
    if (!visible || templateCarouselWidth <= 0 || selectedTemplateIndex < 0) return;
    scrollTemplateToIndex(selectedTemplateIndex, false);
  }, [scrollTemplateToIndex, selectedTemplateIndex, templateCarouselWidth, visible]);

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

  const commitApplyOnce = useCallback(
    (payload: { aspectRatio: AspectRatio; templateId: string }) => {
      if (applyCommittedRef.current) return;
      applyCommittedRef.current = true;
      isClosingFromSwipeRef.current = false;
      dragStartOffsetRef.current = 0;
      if (closeAnimationTimerRef.current) {
        clearTimeout(closeAnimationTimerRef.current);
        closeAnimationTimerRef.current = null;
      }
      onApply(payload);
    },
    [onApply],
  );

  const applyWithSlideDown = useCallback(() => {
    if (isClosingFromSwipeRef.current || closeRequestedRef.current) return;
    closeRequestedRef.current = true;
    isClosingFromSwipeRef.current = true;
    dragStartOffsetRef.current = 0;
    const payload = {
      aspectRatio: draftAspectRatio,
      templateId: draftTemplateId,
    };
    sheetTranslateY.stopAnimation();
    if (closeAnimationTimerRef.current) {
      clearTimeout(closeAnimationTimerRef.current);
    }
    closeAnimationTimerRef.current = setTimeout(() => {
      commitApplyOnce(payload);
    }, 220);
    Animated.timing(sheetTranslateY, {
      toValue: windowHeight + 56,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      commitApplyOnce(payload);
    });
  }, [
    commitApplyOnce,
    draftAspectRatio,
    draftTemplateId,
    sheetTranslateY,
    windowHeight,
  ]);

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
              {canUseNativeEditTemplateControls && expoSwiftUI ? (
                <View style={styles.nativeControlsWrap}>
                  <expoSwiftUI.Host style={styles.nativeControlsHost} colorScheme="dark">
                    <expoSwiftUI.Form>
                      <expoSwiftUI.Section title="Layout">
                        <expoSwiftUI.Picker
                          label="Aspect ratio"
                          options={ASPECT_OPTIONS}
                          selectedIndex={Math.max(0, ASPECT_OPTIONS.indexOf(draftAspectRatio))}
                          variant="segmented"
                          onOptionSelected={(event) => {
                            const nextAspectRatio =
                              ASPECT_OPTIONS[event.nativeEvent.index] ?? ASPECT_OPTIONS[0];
                            handleAspectRatioSelect(nextAspectRatio);
                          }}
                        />
                      </expoSwiftUI.Section>

                      <expoSwiftUI.Section title="Template">
                        <expoSwiftUI.Picker
                          label="Template"
                          options={templateDefinitions.map((option) => option.name)}
                          selectedIndex={selectedTemplateIndex}
                          variant="menu"
                          onOptionSelected={(event) => {
                            const nextTemplateId =
                              templateDefinitions[event.nativeEvent.index]?.id ??
                              templateDefinitions[0]?.id;
                            if (!nextTemplateId) return;
                            handleTemplateSelect(nextTemplateId);
                          }}
                        />
                      </expoSwiftUI.Section>

                      <expoSwiftUI.Section title="Audio & Video">
                        <expoSwiftUI.LabeledContent label="Audio">
                          <expoSwiftUI.Text>
                            {audioLabel || "Current audio"}
                          </expoSwiftUI.Text>
                        </expoSwiftUI.LabeledContent>
                        <expoSwiftUI.Button
                          systemImage="music.note"
                          onPress={onSwapAudio}
                        >
                          Change audio track
                        </expoSwiftUI.Button>
                        <expoSwiftUI.LabeledContent label="Photo">
                          <expoSwiftUI.Text>
                            {photoLabel || "Current image"}
                          </expoSwiftUI.Text>
                        </expoSwiftUI.LabeledContent>
                        <expoSwiftUI.Button
                          systemImage="photo"
                          onPress={onSwapPhoto}
                        >
                          Change photo
                        </expoSwiftUI.Button>
                      </expoSwiftUI.Section>
                    </expoSwiftUI.Form>
                  </expoSwiftUI.Host>
                </View>
              ) : (
                <>
                  <View style={styles.section}>
                    <View style={styles.templateHeader}>
                      <Text style={styles.sectionLabel}>Template</Text>
                    </View>
                    <View
                      style={styles.templateCarouselTrack}
                      onLayout={handleTemplateCarouselLayout}
                    >
                      <Animated.ScrollView
                        ref={templateCarouselRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={[
                          styles.templateCarouselContent,
                          { paddingHorizontal: templateCarouselSideInset },
                        ]}
                        snapToInterval={templateSnapInterval}
                        snapToAlignment="start"
                        decelerationRate="fast"
                        disableIntervalMomentum
                        onMomentumScrollEnd={handleTemplateMomentumEnd}
                        onScrollEndDrag={handleTemplateMomentumEnd}
                        onScroll={Animated.event(
                          [{ nativeEvent: { contentOffset: { x: templateScrollX } } }],
                          { useNativeDriver: true },
                        )}
                        scrollEventThrottle={16}
                      >
                        {templateDefinitions.map((option, index) => {
                          const selected = option.id === draftTemplateId;
                          const inputRange = [
                            (index - 1) * templateSnapInterval,
                            index * templateSnapInterval,
                            (index + 1) * templateSnapInterval,
                          ];
                          const cardOpacity = templateScrollX.interpolate({
                            inputRange,
                            outputRange: [0.46, 1, 0.46],
                            extrapolate: "clamp",
                          });
                          const cardScale = templateScrollX.interpolate({
                            inputRange,
                            outputRange: [0.82, 1, 0.82],
                            extrapolate: "clamp",
                          });
                          const cardTranslateY = templateScrollX.interpolate({
                            inputRange,
                            outputRange: [12, 0, 12],
                            extrapolate: "clamp",
                          });

                          return (
                            <Animated.View
                              key={`template-quick-${option.id}`}
                              style={[
                                styles.templateCardWrap,
                                index < templateDefinitions.length - 1 && styles.templateCardGap,
                                {
                                  opacity: cardOpacity,
                                  transform: [
                                    { scale: cardScale },
                                    { translateY: cardTranslateY },
                                  ],
                                },
                              ]}
                            >
                              <Pressable
                                onPress={() => {
                                  handleTemplateSelect(option.id);
                                  scrollTemplateToIndex(index, true);
                                }}
                                style={[
                                  styles.templateCard,
                                  selected && styles.templateCardSelected,
                                ]}
                                hitSlop={8}
                                accessibilityLabel={`Select ${option.name} template`}
                                accessibilityRole="button"
                                accessibilityState={{ selected }}
                              >
                                <View
                                  style={[
                                    styles.templateCardIconWrap,
                                    selected && styles.templateCardIconWrapSelected,
                                  ]}
                                >
                                  <Ionicons
                                    name={getTemplateIcon(option.id)}
                                    size={24}
                                    color={selected ? "#0D1118" : colors.dark.text}
                                  />
                                </View>
                                <Text
                                  style={[
                                    styles.templateCardText,
                                    selected && styles.templateCardTextSelected,
                                  ]}
                                >
                                  {option.name}
                                </Text>
                              </Pressable>
                            </Animated.View>
                          );
                        })}
                      </Animated.ScrollView>
                    </View>
                    <View style={styles.templateDotsRow}>
                      {templateDefinitions.map((option, index) => {
                        const active = index === selectedTemplateIndex;
                        return (
                          <View
                            key={`template-dot-${option.id}`}
                            style={[
                              styles.templateDot,
                              active && styles.templateDotActive,
                            ]}
                          />
                        );
                      })}
                    </View>
                  </View>

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
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={colors.dark.textSecondary}
                      />
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
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={colors.dark.textSecondary}
                      />
                    </Pressable>
                  </View>
                </>
              )}
            </View>

            <View style={styles.footer}>
              <Pressable
                onPress={applyWithSlideDown}
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
    maxHeight: "70%",
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
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  nativeControlsWrap: {
    minHeight: 260,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  nativeControlsHost: {
    flex: 1,
    backgroundColor: colors.dark.background,
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
    alignItems: "flex-start",
  },
  templateCarouselContent: {
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  templateCarouselTrack: {
    width: "100%",
    paddingBottom: spacing.sm,
  },
  templateCardWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  templateCard: {
    minHeight: TEMPLATE_CARD_HEIGHT,
    height: TEMPLATE_CARD_HEIGHT,
    width: TEMPLATE_CARD_WIDTH,
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  templateCardGap: {
    marginRight: TEMPLATE_CARD_GAP,
  },
  templateCardSelected: {
    backgroundColor: "rgba(30,156,83,0.18)",
    borderColor: "rgba(30,156,83,0.62)",
    shadowColor: colors.accent.primary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  templateCardIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  templateCardIconWrapSelected: {
    backgroundColor: colors.accent.primary,
  },
  templateCardText: {
    ...typography.caption,
    color: colors.dark.text,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  templateCardTextSelected: {
    color: colors.accent.onPrimary,
  },
  templateDotsRow: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  templateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.28)",
  },
  templateDotActive: {
    width: 16,
    borderRadius: 4,
    backgroundColor: colors.accent.primary,
  },
  aspectRow: {
    flexDirection: "row",
    width: "100%",
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 2,
    gap: 2,
  },
  optionPill: {
    flex: 1,
    minHeight: 36,
    borderRadius: radius.full,
    backgroundColor: "transparent",
    borderWidth: 0,
    borderColor: "transparent",
    paddingHorizontal: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  optionPillSelected: {
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
