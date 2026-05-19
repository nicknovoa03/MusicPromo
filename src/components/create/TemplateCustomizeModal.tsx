import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  ActivityIndicator,
  Alert,
  Easing,
  Linking,
  Image as RNImage,
  Modal,
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
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { type AspectRatio } from "@/components/create/AspectRatioToggle";
import { CustomColorPanel } from "@/components/create/background/CustomColorPanel";
import {
  CUSTOM_LIGHTNESS_MAX,
  CUSTOM_LIGHTNESS_MIN,
  DEFAULT_CUSTOM_HUE,
  DEFAULT_CUSTOM_LIGHTNESS,
  DEFAULT_CUSTOM_SATURATION,
  parseCustomColorFromHex,
} from "@/components/create/background/paletteData";
import type { PaletteSwatch } from "@/components/create/background/PaletteStrip";
import {
  buildPhotoMatchedBackgroundOptions,
  isPresetBackgroundColor,
} from "@/components/create/background/photoMatchedBackground";
import type { BackgroundOption } from "@/components/create/background/types";
import { clamp, hexToHsl, hslToHex } from "@/lib/colorUtils";
import { TemplateInfoBadge } from "@/components/create/TemplateInfoBadge";
import {
  TemplateSwitcher,
  type TemplateSwitcherOption,
} from "@/components/create/TemplateSwitcher";
import { colors, radius, spacing, typography } from "@/constants/tokens";
import {
  getIOSNativeUIPhase5Availability,
  loadExpoSwiftUIModule,
} from "@/lib/iosNativeUi";
import { persistPickedMediaFile } from "@/lib/mediaStorage";
import {
  getTemplateDefinition,
  type TemplateDefinition,
  type TemplateTweaks,
} from "@/lib/templates";

interface TemplateCustomizeModalProps {
  visible: boolean;
  aspectRatio: AspectRatio;
  templateId: string;
  templateDefinitions: TemplateDefinition[];
  photoUri?: string | null;
  photoLabel: string;
  audioLabel: string;
  value: TemplateTweaks;
  showTemplateInfo?: boolean;
  onTemplateSelectionChanged?: (nextTemplateId: string) => void;
  onSwapPhoto: () => void;
  onSwapAudio: () => void;
  onClose: () => void;
  onApply: (next: {
    tweaks: TemplateTweaks;
    aspectRatio: AspectRatio;
    templateId: string;
  }) => void;
}

type TemplateControlTab =
  | "layout"
  | "quickTune"
  | "background"
  | "advancedMotion"
  | "media";

const TEMPLATE_CONTROL_TABS: Array<{ id: TemplateControlTab; label: string }> = [
  { id: "layout", label: "Layout" },
  { id: "quickTune", label: "Style" },
  { id: "background", label: "Backdrop" },
  { id: "advancedMotion", label: "Motion" },
  { id: "media", label: "Media" },
];
const ASPECT_OPTIONS: AspectRatio[] = ["1:1", "4:5", "9:16"];

const SPIN_SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5];
const RECORD_SIZE_OPTIONS = [0.8, 1, 1.2];
const ARTWORK_SCALE_OPTIONS = [1.5, 3, 4.5];
const MIN_ARTWORK_SCALE = ARTWORK_SCALE_OPTIONS[0] ?? 1.5;
const DEFAULT_ARTWORK_SCALE = ARTWORK_SCALE_OPTIONS[1] ?? 3;
const MAX_ARTWORK_SCALE =
  ARTWORK_SCALE_OPTIONS[ARTWORK_SCALE_OPTIONS.length - 1] ?? 4.5;
const RECORD_TRANSPARENCY_OPTIONS = [0, 0.15, 0.3, 0.45, 0.6];
const BACKGROUND_BLUR_OPTIONS = [0, 2, 4, 8, 12, 18];
const ROTATION_START_OPTIONS = [0, 90, 180, -90];
const ROTATION_DIRECTION_OPTIONS: Array<{
  label: string;
  value: "cw" | "ccw";
}> = [
  { label: "CW", value: "cw" },
  { label: "CCW", value: "ccw" },
];
const STAGE_HORIZONTAL_PADDING = spacing.sm * 2;
const SHEET_RESTING_OFFSET = 14;
const CORE_BACKGROUND_OPTIONS: BackgroundOption[] = [
  { id: "default", label: "Default", color: null, swatch: "#000000" },
];
const FALLBACK_BACKGROUND_OPTIONS: BackgroundOption[] = [
  { id: "indigo", label: "Indigo", color: "#14142d", swatch: "#35357a" },
  { id: "midnight", label: "Midnight", color: "#0a0f1c", swatch: "#1d2f58" },
  { id: "charcoal", label: "Charcoal", color: "#111114", swatch: "#37373e" },
  { id: "sunset", label: "Sunset", color: "#211121", swatch: "#8f3f7d" },
];

function withCoreBackgroundOptions(options: BackgroundOption[]): BackgroundOption[] {
  const merged: BackgroundOption[] = [...CORE_BACKGROUND_OPTIONS];
  for (const option of options) {
    const hasMatch = merged.some(
      (entry) => entry.id === option.id || entry.color === option.color,
    );
    if (!hasMatch) {
      merged.push(option);
    }
  }
  return merged;
}

function formatSpeed(value: number): string {
  return `${value.toFixed(value % 1 === 0 ? 0 : 2)}x`;
}

function formatTransparency(value: number): string {
  return `${Math.round(clamp(value, 0, 1) * 100)}%`;
}

function formatRecordSize(value: number): string {
  const normalized = clamp(value, 0.75, 1.3);
  const rounded = Math.round(normalized * 10) / 10;
  if (Math.abs(rounded - Math.round(rounded)) < 0.05) {
    return `${Math.round(rounded)}x`;
  }
  return `${rounded.toFixed(1).replace(/^0/, "")}x`;
}

function formatArtworkScale(value: number): string {
  const normalized = clamp(value, MIN_ARTWORK_SCALE, MAX_ARTWORK_SCALE);
  const rebased = normalized / DEFAULT_ARTWORK_SCALE;
  const rounded = Math.round(rebased * 10) / 10;
  if (Math.abs(rounded - Math.round(rounded)) < 0.05) {
    return `${Math.round(rounded)}x`;
  }
  return `${rounded.toFixed(1).replace(/^0/, "")}x`;
}

function formatArtworkScalePercent(value: number): string {
  const normalized = clamp(value, MIN_ARTWORK_SCALE, MAX_ARTWORK_SCALE);
  return `${Math.round((normalized / DEFAULT_ARTWORK_SCALE) * 100)}%`;
}

function formatBlur(value: number): string {
  return value <= 0 ? "Off" : `${value}px`;
}

function formatRotationStart(value: number): string {
  if (value === 0) return "0°";
  const displayValue = value === -90 ? 270 : value;
  return `${displayValue}°`;
}

function findClosestOptionIndex(options: number[], value: number): number {
  const exactIndex = options.indexOf(value);
  if (exactIndex >= 0) return exactIndex;
  if (options.length === 0) return 0;

  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    const distance = Math.abs(option - value);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  }
  return closestIndex;
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
  aspectRatio,
  templateId,
  templateDefinitions,
  photoUri,
  photoLabel,
  audioLabel,
  value,
  showTemplateInfo = false,
  onTemplateSelectionChanged,
  onSwapPhoto,
  onSwapAudio,
  onClose,
  onApply,
}: TemplateCustomizeModalProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sheetTranslateY = useRef(new Animated.Value(0)).current;
  const windowWidthRef = useRef(windowWidth);
  const windowHeightRef = useRef(windowHeight);
  const openAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const dragStartOffsetRef = useRef(0);
  const isClosingFromSwipeRef = useRef(false);
  const closeRequestedRef = useRef(false);
  const closeAnimationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [draft, setDraft] = useState<TemplateTweaks>(value);
  const [draftAspectRatio, setDraftAspectRatio] = useState<AspectRatio>(aspectRatio);
  const [draftTemplateId, setDraftTemplateId] = useState<string>(templateId);
  const [customHue, setCustomHue] = useState(DEFAULT_CUSTOM_HUE);
  const [customSaturation, setCustomSaturation] = useState(DEFAULT_CUSTOM_SATURATION);
  const [customLightness, setCustomLightness] = useState(DEFAULT_CUSTOM_LIGHTNESS);
  const [isCustomColorEnabled, setIsCustomColorEnabled] = useState(false);
  const [isBackgroundPhotoLoading, setIsBackgroundPhotoLoading] = useState(false);
  const [activeControlTab, setActiveControlTab] = useState<TemplateControlTab>(
    "layout",
  );
  const [lastPresetBackgroundColor, setLastPresetBackgroundColor] = useState<
    string | null
  >(null);
  const [backgroundOptions, setBackgroundOptions] = useState<BackgroundOption[]>(
    withCoreBackgroundOptions(FALLBACK_BACKGROUND_OPTIONS),
  );
  const customColor = useMemo(
    () => hslToHex(customHue, customSaturation, customLightness),
    [customHue, customSaturation, customLightness],
  );
  const modalTopInset = useMemo(() => {
    if (Platform.OS !== "ios") return 0;
    if (insets.top > 0) return insets.top;
    return 44;
  }, [insets.top]);

  useEffect(() => {
    if (visible) return;
    windowWidthRef.current = windowWidth;
    windowHeightRef.current = windowHeight;
  }, [visible, windowHeight, windowWidth]);

  useEffect(() => {
    if (!visible) return;
    isClosingFromSwipeRef.current = false;
    closeRequestedRef.current = false;
    if (closeAnimationTimerRef.current) {
      clearTimeout(closeAnimationTimerRef.current);
      closeAnimationTimerRef.current = null;
    }
    dragStartOffsetRef.current = 0;
    openAnimationRef.current?.stop();
    const entryOffset = Math.max(windowHeightRef.current + SHEET_RESTING_OFFSET, 1);
    sheetTranslateY.stopAnimation();
    sheetTranslateY.setValue(entryOffset);
    openAnimationRef.current = Animated.timing(sheetTranslateY, {
      toValue: SHEET_RESTING_OFFSET,
      duration: 220,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    });
    openAnimationRef.current.start(({ finished }) => {
      if (finished) {
        sheetTranslateY.setValue(SHEET_RESTING_OFFSET);
      }
      openAnimationRef.current = null;
    });
    setActiveControlTab("layout");
  }, [visible, sheetTranslateY]);

  useEffect(
    () => () => {
      openAnimationRef.current?.stop();
      openAnimationRef.current = null;
      if (closeAnimationTimerRef.current) {
        clearTimeout(closeAnimationTimerRef.current);
        closeAnimationTimerRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    const nextPhotoUri = photoUri?.trim();
    if (!nextPhotoUri) {
      setBackgroundOptions(withCoreBackgroundOptions(FALLBACK_BACKGROUND_OPTIONS));
      return;
    }

    let isActive = true;
    void buildPhotoMatchedBackgroundOptions(nextPhotoUri).then((matchedOptions) => {
      if (!isActive) return;
      setBackgroundOptions(
        withCoreBackgroundOptions(matchedOptions ?? FALLBACK_BACKGROUND_OPTIONS),
      );
    });
    return () => {
      isActive = false;
    };
  }, [photoUri]);

  useEffect(() => {
    if (!visible) return;
    setDraft(value);
    setDraftAspectRatio(aspectRatio);
    setDraftTemplateId(templateId);
    const hasBackgroundPhoto = Boolean(value.stageBackgroundImageUri);
    const isPreset = isPresetBackgroundColor(
      value.stageBackgroundColor,
      backgroundOptions,
    );
    setIsCustomColorEnabled(
      !hasBackgroundPhoto && Boolean(value.stageBackgroundColor && !isPreset),
    );
    setLastPresetBackgroundColor(isPreset ? value.stageBackgroundColor ?? null : null);

    const parsed = parseCustomColorFromHex(value.stageBackgroundColor ?? null);
    setCustomHue(parsed.hue);
    setCustomSaturation(parsed.saturation);
    setCustomLightness(parsed.lightness);
  }, [aspectRatio, backgroundOptions, templateId, value, visible]);

  const isBackgroundPhotoSelected = Boolean(draft.stageBackgroundImageUri);
  const templateDefinition = getTemplateDefinition(draftTemplateId);
  const TemplateStageComponent = templateDefinition.StageComponent;
  const isVinylTemplate = templateDefinition.parity.vinylTone === "simple-spin";
  const usesGenericSizeLabel =
    templateDefinition.id === "whole" || templateDefinition.id === "cd";
  const recordSizeControlLabel = usesGenericSizeLabel ? "Size" : "Record Size";
  const recordSizeNativeLabel = usesGenericSizeLabel ? "Size" : "Record size";
  const recordSizeAccessibilityPrefix = usesGenericSizeLabel ? "Size" : "Record size";
  const stageViewportWidth = visible ? windowWidthRef.current : windowWidth;
  const stageViewportHeight = visible ? windowHeightRef.current : windowHeight;
  const previewStageSize = Math.min(
    stageViewportWidth - STAGE_HORIZONTAL_PADDING,
    stageViewportHeight * 0.66,
    520,
  );
  const showToneOptions = customSaturation > 2;
  const nativeTemplateControlsAvailability = getIOSNativeUIPhase5Availability({
    minIOSVersion: 16,
  });
  const nativeTemplateControlsEnabledByContract =
    nativeTemplateControlsAvailability.enabled;
  const expoSwiftUI = nativeTemplateControlsEnabledByContract
    ? loadExpoSwiftUIModule()
    : null;
  const expoSwiftUIAny = expoSwiftUI as Record<string, unknown> | null;
  const hasNativeTemplateControlsComponents = Boolean(
    expoSwiftUIAny &&
      "Host" in expoSwiftUIAny &&
      "Form" in expoSwiftUIAny &&
      "Section" in expoSwiftUIAny &&
      "Picker" in expoSwiftUIAny &&
      "Slider" in expoSwiftUIAny &&
      "LabeledContent" in expoSwiftUIAny &&
      "Text" in expoSwiftUIAny &&
      "Button" in expoSwiftUIAny &&
      "ColorPicker" in expoSwiftUIAny &&
      "Switch" in expoSwiftUIAny,
  );
  const canUseNativeTemplateControls =
    false &&
    nativeTemplateControlsEnabledByContract &&
    expoSwiftUI !== null &&
    hasNativeTemplateControlsComponents;
  const backgroundOptionsLabels = useMemo(
    () => backgroundOptions.map((option) => option.label),
    [backgroundOptions],
  );
  const selectedBackgroundOptionIndex = useMemo(() => {
    const optionIndex = backgroundOptions.findIndex(
      (option) => option.color === (draft.stageBackgroundColor ?? null),
    );
    return optionIndex >= 0 ? optionIndex : null;
  }, [backgroundOptions, draft.stageBackgroundColor]);
  const activeControlTabIndex = useMemo(
    () =>
      Math.max(
        0,
        TEMPLATE_CONTROL_TABS.findIndex((tab) => tab.id === activeControlTab),
      ),
    [activeControlTab],
  );
  const templateSwitcherOptions = useMemo<TemplateSwitcherOption[]>(
    () =>
      templateDefinitions.map((option) => ({
        id: option.id,
        name: option.name,
      })),
    [templateDefinitions],
  );

  const updateSpinSpeed = useCallback((spinSpeed: number, withHaptics = true) => {
    if (spinSpeed === draft.spinSpeed) return;
    setDraft((prev) => ({ ...prev, spinSpeed }));
    if (withHaptics) {
      void triggerSelectionHaptic();
    }
  }, [draft.spinSpeed]);

  const updateRecordSize = useCallback((recordSize: number, withHaptics = true) => {
    if (recordSize === draft.recordSize) return;
    setDraft((prev) => ({ ...prev, recordSize }));
    if (withHaptics) {
      void triggerSelectionHaptic();
    }
  }, [draft.recordSize]);

  const updateArtworkScale = useCallback((artworkScale: number, withHaptics = true) => {
    if (artworkScale === draft.artworkScale) return;
    setDraft((prev) => ({ ...prev, artworkScale }));
    if (withHaptics) {
      void triggerSelectionHaptic();
    }
  }, [draft.artworkScale]);

  const updateRecordTransparency = useCallback((
    recordTransparency: number,
    withHaptics = true,
  ) => {
    if (recordTransparency === draft.recordTransparency) return;
    setDraft((prev) => ({ ...prev, recordTransparency }));
    if (withHaptics) {
      void triggerSelectionHaptic();
    }
  }, [draft.recordTransparency]);

  const updateBackgroundBlur = useCallback((backgroundBlur: number, withHaptics = true) => {
    if (backgroundBlur === draft.backgroundBlur) return;
    setDraft((prev) => ({ ...prev, backgroundBlur }));
    if (withHaptics) {
      void triggerSelectionHaptic();
    }
  }, [draft.backgroundBlur]);

  const updateShowWatermark = useCallback((showWatermark: boolean, withHaptics = true) => {
    if (showWatermark === draft.showWatermark) return;
    setDraft((prev) => ({ ...prev, showWatermark }));
    if (withHaptics) {
      void triggerSelectionHaptic();
    }
  }, [draft.showWatermark]);

  const updateRotationStartDeg = useCallback((
    rotationStartDeg: number,
    withHaptics = true,
  ) => {
    if (rotationStartDeg === draft.rotationStartDeg) return;
    setDraft((prev) => ({ ...prev, rotationStartDeg }));
    if (withHaptics) {
      void triggerSelectionHaptic();
    }
  }, [draft.rotationStartDeg]);

  const updateRotationDirection = useCallback((rotationDirection: "cw" | "ccw") => {
    if (rotationDirection === draft.rotationDirection) return;
    setDraft((prev) => ({ ...prev, rotationDirection }));
    void triggerSelectionHaptic();
  }, [draft.rotationDirection]);

  const updateBackground = useCallback(
    (stageBackgroundColor: string | null, withHaptics = true) => {
      const nextColor = stageBackgroundColor ?? null;
      if (
        nextColor === (draft.stageBackgroundColor ?? null) &&
        !draft.stageBackgroundImageUri
      ) {
        return;
      }
      setDraft((prev) => ({
        ...prev,
        stageBackgroundColor: nextColor,
        stageBackgroundImageUri: null,
      }));
      if (withHaptics) {
        void triggerSelectionHaptic();
      }
    },
    [draft.stageBackgroundColor, draft.stageBackgroundImageUri],
  );

  const toggleCustomColorEnabled = useCallback(
    (enabled: boolean) => {
      setIsCustomColorEnabled(enabled);
      if (enabled) {
        const current = draft.stageBackgroundColor ?? null;
        if (
          current &&
          backgroundOptions.some((option) => option.color === current)
        ) {
          setLastPresetBackgroundColor(current);
        }
        updateBackground(customColor);
        return;
      }

      const fallback = lastPresetBackgroundColor ?? null;
      updateBackground(fallback);
    },
    [
      backgroundOptions,
      customColor,
      draft.stageBackgroundColor,
      lastPresetBackgroundColor,
      updateBackground,
    ],
  );

  const handleCustomPaletteSelect = useCallback(
    (swatch: PaletteSwatch) => {
      const nextHue = clamp(swatch.h, 0, 360);
      const nextSaturation = clamp(swatch.s, 0, 100);
      const nextLightness = clamp(
        swatch.l,
        CUSTOM_LIGHTNESS_MIN,
        CUSTOM_LIGHTNESS_MAX,
      );
      setCustomHue(nextHue);
      setCustomSaturation(nextSaturation);
      setCustomLightness(nextLightness);
      if (isCustomColorEnabled) {
        updateBackground(hslToHex(nextHue, nextSaturation, nextLightness), false);
      }
      void triggerSelectionHaptic();
    },
    [isCustomColorEnabled, updateBackground],
  );

  const handleCustomLightnessChange = useCallback(
    (nextLightness: number) => {
      const clampedLightness = clamp(
        nextLightness,
        CUSTOM_LIGHTNESS_MIN,
        CUSTOM_LIGHTNESS_MAX,
      );
      setCustomLightness(clampedLightness);
      if (!isCustomColorEnabled) return;
      updateBackground(
        hslToHex(customHue, customSaturation, clampedLightness),
        false,
      );
    },
    [customHue, customSaturation, isCustomColorEnabled, updateBackground],
  );

  const handleCustomToneSelect = useCallback(
    (tone: number) => {
      if (tone === customLightness) return;
      handleCustomLightnessChange(tone);
      void triggerSelectionHaptic();
    },
    [customLightness, handleCustomLightnessChange],
  );

  const setBackgroundPhoto = useCallback(
    (stageBackgroundImageUri: string | null) => {
      const nextUri = stageBackgroundImageUri ?? null;
      if (
        nextUri === (draft.stageBackgroundImageUri ?? null) &&
        !isCustomColorEnabled
      ) {
        return;
      }
      setIsCustomColorEnabled(false);
      setDraft((prev) => ({
        ...prev,
        stageBackgroundImageUri: nextUri,
      }));
      if (nextUri) {
        void triggerSelectionHaptic();
      }
    },
    [draft.stageBackgroundImageUri, isCustomColorEnabled],
  );

  const handlePickBackgroundPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Allow photo access to use an image as template background.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => void Linking.openSettings() },
        ],
      );
      return;
    }

    setIsBackgroundPhotoLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
        allowsEditing: false,
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });
      if (result.canceled || !result.assets[0]) return;

      const picked = result.assets[0];
      const persistedUri = await persistPickedMediaFile({
        sourceUri: picked.uri,
        fileNameHint:
          picked.fileName ?? picked.uri.split("/").pop() ?? "background-image.jpg",
      });
      setBackgroundPhoto(persistedUri);
    } catch {
      Alert.alert(
        "Background not applied",
        "Could not load that image. Please try another photo.",
      );
    } finally {
      setIsBackgroundPhotoLoading(false);
    }
  }, [setBackgroundPhoto]);

  const animateSheetBackToRest = useCallback(() => {
    Animated.timing(sheetTranslateY, {
      toValue: SHEET_RESTING_OFFSET,
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
    openAnimationRef.current?.stop();
    openAnimationRef.current = null;
    sheetTranslateY.stopAnimation();
    if (closeAnimationTimerRef.current) {
      clearTimeout(closeAnimationTimerRef.current);
    }
    closeAnimationTimerRef.current = setTimeout(() => {
      requestCloseOnce();
    }, 220);
    Animated.timing(sheetTranslateY, {
      toValue: windowHeight + SHEET_RESTING_OFFSET + 56,
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
          if (
            gestureState.dy <= 0 &&
            dragStartOffsetRef.current <= SHEET_RESTING_OFFSET
          ) {
            return;
          }
          const nextOffset = clamp(
            dragStartOffsetRef.current + gestureState.dy,
            SHEET_RESTING_OFFSET,
            windowHeight,
          );
          sheetTranslateY.setValue(nextOffset);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (isClosingFromSwipeRef.current || closeRequestedRef.current) return;
          const draggedDistance = dragStartOffsetRef.current + gestureState.dy;
          const pullDistance = Math.max(
            0,
            draggedDistance - SHEET_RESTING_OFFSET,
          );
          const shouldDismiss = pullDistance > 12 || gestureState.vy > 0.12;
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
            if (currentValue > SHEET_RESTING_OFFSET + 2) {
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

  const backdropOpacity = useMemo(
    () =>
      sheetTranslateY.interpolate({
        inputRange: [
          SHEET_RESTING_OFFSET,
          windowHeight * 0.55,
          windowHeight + SHEET_RESTING_OFFSET,
        ],
        outputRange: [0.36, 0.18, 0],
        extrapolate: "clamp",
      }),
    [sheetTranslateY, windowHeight],
  );

  const handleNativeBackgroundPresetSelect = useCallback(
    (index: number) => {
      const option = backgroundOptions[index];
      if (!option) return;
      setIsCustomColorEnabled(false);
      setLastPresetBackgroundColor(option.color);
      updateBackground(option.color);
    },
    [backgroundOptions, updateBackground],
  );

  const handleNativeBackgroundColorChange = useCallback(
    (nextColor: string) => {
      setIsCustomColorEnabled(true);
      const parsed = hexToHsl(nextColor);
      if (parsed) {
        setCustomHue(parsed.h);
        setCustomSaturation(clamp(parsed.s, 0, 100));
        setCustomLightness(clamp(parsed.l, CUSTOM_LIGHTNESS_MIN, CUSTOM_LIGHTNESS_MAX));
      }
      updateBackground(nextColor, false);
    },
    [updateBackground],
  );
  const handleControlTabSelect = useCallback(
    (nextTab: TemplateControlTab, withHaptics = true) => {
      if (nextTab === activeControlTab) return;
      setActiveControlTab(nextTab);
      if (withHaptics) {
        void triggerSelectionHaptic();
      }
    },
    [activeControlTab],
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
      void triggerSelectionHaptic();
    },
    [draftTemplateId, onTemplateSelectionChanged],
  );

  return (
    <Modal
      visible={visible}
      animationType="none"
      presentationStyle="overFullScreen"
      transparent
      allowSwipeDismissal={false}
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Animated.View
          pointerEvents="none"
          style={[styles.modalBackdrop, { opacity: backdropOpacity }]}
        />
        <Animated.View
          style={[
            styles.sheetAnimatedLayer,
            {
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          <SafeAreaView style={styles.root} edges={["bottom"]}>
          <View
            style={[styles.topGestureZone, { paddingTop: modalTopInset }]}
            {...headerPanResponder.panHandlers}
          >
            <View style={styles.headerGestureArea}>
              <View style={styles.dragHandle} />
            </View>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Template Controls</Text>
            </View>
          </View>

          <View style={styles.previewContainer}>
            <View style={styles.previewCard}>
              <TemplateStageComponent
                width={previewStageSize}
                height={previewStageSize}
                aspectRatio="1:1"
                photoUri={photoUri ?? null}
                isPlaying
                playbackLabel="Now Playing"
                trackTitle="Template Preview"
                subtitle="Template Controls"
                templateTweaks={draft}
                showWatermark={draft.showWatermark}
              />
              {showTemplateInfo ? (
                <TemplateInfoBadge
                  templateId={templateId}
                  templateTweaks={draft}
                  aspectRatio="1:1"
                  compact
                  style={styles.previewTemplateInfoBadge}
                />
              ) : null}
            </View>
          </View>

          {canUseNativeTemplateControls && expoSwiftUI ? (
            <View style={styles.nativeControlsWrap}>
              <expoSwiftUI.Host
                style={styles.nativeControlsHost}
                useViewportSizeMeasurement
                colorScheme="dark"
              >
                <expoSwiftUI.Form>
                  <expoSwiftUI.Section>
                    <expoSwiftUI.Picker
                      label="Template control tabs"
                      options={TEMPLATE_CONTROL_TABS.map((tab) => tab.label)}
                      selectedIndex={activeControlTabIndex}
                      variant="segmented"
                      onOptionSelected={(event) => {
                        const nextTab =
                          TEMPLATE_CONTROL_TABS[event.nativeEvent.index]?.id ?? "quickTune";
                        handleControlTabSelect(nextTab, false);
                      }}
                    />
                    {activeControlTab === "quickTune" ? (
                      <>
                        <expoSwiftUI.LabeledContent label={recordSizeNativeLabel}>
                          <expoSwiftUI.Text>{formatRecordSize(draft.recordSize)}</expoSwiftUI.Text>
                        </expoSwiftUI.LabeledContent>
                        <expoSwiftUI.Slider
                          min={0}
                          max={RECORD_SIZE_OPTIONS.length - 1}
                          steps={RECORD_SIZE_OPTIONS.length - 1}
                          value={findClosestOptionIndex(RECORD_SIZE_OPTIONS, draft.recordSize)}
                          color={colors.accent.primary}
                          onValueChange={(nextValue) => {
                            const sliderIndex = Math.round(
                              clamp(nextValue, 0, RECORD_SIZE_OPTIONS.length - 1),
                            );
                            const recordSize =
                              RECORD_SIZE_OPTIONS[sliderIndex] ?? draft.recordSize;
                            updateRecordSize(recordSize, false);
                          }}
                        />
                        {isVinylTemplate ? (
                          <>
                            <expoSwiftUI.LabeledContent label="Artwork size">
                              <expoSwiftUI.Text>
                                {`${formatArtworkScale(draft.artworkScale)} (${formatArtworkScalePercent(draft.artworkScale)})`}
                              </expoSwiftUI.Text>
                            </expoSwiftUI.LabeledContent>
                            <expoSwiftUI.Slider
                              min={0}
                              max={ARTWORK_SCALE_OPTIONS.length - 1}
                              steps={ARTWORK_SCALE_OPTIONS.length - 1}
                              value={findClosestOptionIndex(ARTWORK_SCALE_OPTIONS, draft.artworkScale)}
                              color={colors.accent.primary}
                              onValueChange={(nextValue) => {
                                const sliderIndex = Math.round(
                                  clamp(nextValue, 0, ARTWORK_SCALE_OPTIONS.length - 1),
                                );
                                const artworkScale =
                                  ARTWORK_SCALE_OPTIONS[sliderIndex] ?? draft.artworkScale;
                                updateArtworkScale(artworkScale, false);
                              }}
                            />
                          </>
                        ) : null}
                        <expoSwiftUI.LabeledContent label="Transparency">
                          <expoSwiftUI.Text>
                            {formatTransparency(draft.recordTransparency)}
                          </expoSwiftUI.Text>
                        </expoSwiftUI.LabeledContent>
                        <expoSwiftUI.Slider
                          min={0}
                          max={RECORD_TRANSPARENCY_OPTIONS.length - 1}
                          steps={RECORD_TRANSPARENCY_OPTIONS.length - 1}
                          value={findClosestOptionIndex(
                            RECORD_TRANSPARENCY_OPTIONS,
                            draft.recordTransparency,
                          )}
                          color={colors.accent.primary}
                          onValueChange={(nextValue) => {
                            const sliderIndex = Math.round(
                              clamp(nextValue, 0, RECORD_TRANSPARENCY_OPTIONS.length - 1),
                            );
                            const recordTransparency =
                              RECORD_TRANSPARENCY_OPTIONS[sliderIndex] ??
                              draft.recordTransparency;
                            updateRecordTransparency(recordTransparency, false);
                          }}
                        />
                      </>
                    ) : null}

                    {activeControlTab === "background" ? (
                      <>
                        <expoSwiftUI.LabeledContent label="Photo background">
                          <expoSwiftUI.Text>
                            {draft.stageBackgroundImageUri ? "Selected" : "None"}
                          </expoSwiftUI.Text>
                        </expoSwiftUI.LabeledContent>
                        <expoSwiftUI.Button
                          systemImage="photo.badge.plus"
                          disabled={isBackgroundPhotoLoading}
                          onPress={() => {
                            void handlePickBackgroundPhoto();
                          }}
                        >
                          {isBackgroundPhotoLoading
                            ? "Loading photo..."
                            : "Choose background photo"}
                        </expoSwiftUI.Button>
                        {draft.stageBackgroundImageUri ? (
                          <expoSwiftUI.Button
                            systemImage="xmark.circle"
                            onPress={() => {
                              setBackgroundPhoto(null);
                            }}
                          >
                            Remove background photo
                          </expoSwiftUI.Button>
                        ) : null}
                        <expoSwiftUI.ColorPicker
                          label="Custom color"
                          selection={draft.stageBackgroundColor ?? customColor}
                          supportsOpacity={false}
                          onValueChanged={handleNativeBackgroundColorChange}
                        />
                        <expoSwiftUI.Picker
                          label="Preset"
                          options={backgroundOptionsLabels}
                          selectedIndex={selectedBackgroundOptionIndex}
                          variant="menu"
                          onOptionSelected={(event) => {
                            handleNativeBackgroundPresetSelect(event.nativeEvent.index);
                          }}
                        />
                        {isBackgroundPhotoSelected ? (
                          <>
                            <expoSwiftUI.LabeledContent label="Background blur">
                              <expoSwiftUI.Text>{formatBlur(draft.backgroundBlur)}</expoSwiftUI.Text>
                            </expoSwiftUI.LabeledContent>
                            <expoSwiftUI.Slider
                              min={0}
                              max={BACKGROUND_BLUR_OPTIONS.length - 1}
                              steps={BACKGROUND_BLUR_OPTIONS.length - 1}
                              value={findClosestOptionIndex(
                                BACKGROUND_BLUR_OPTIONS,
                                draft.backgroundBlur,
                              )}
                              color={colors.accent.primary}
                              onValueChange={(nextValue) => {
                                const sliderIndex = Math.round(
                                  clamp(nextValue, 0, BACKGROUND_BLUR_OPTIONS.length - 1),
                                );
                                const backgroundBlur =
                                  BACKGROUND_BLUR_OPTIONS[sliderIndex] ?? draft.backgroundBlur;
                                updateBackgroundBlur(backgroundBlur, false);
                              }}
                            />
                          </>
                        ) : null}
                        <expoSwiftUI.Switch
                          label="Watermark"
                          value={draft.showWatermark}
                          variant="button"
                          onValueChange={(nextValue) => {
                            updateShowWatermark(nextValue, false);
                          }}
                        />
                      </>
                    ) : null}

                    {activeControlTab === "advancedMotion" ? (
                      <>
                        <expoSwiftUI.LabeledContent label="Spin speed">
                          <expoSwiftUI.Text>{formatSpeed(draft.spinSpeed)}</expoSwiftUI.Text>
                        </expoSwiftUI.LabeledContent>
                        <expoSwiftUI.Slider
                          min={0}
                          max={SPIN_SPEED_OPTIONS.length - 1}
                          steps={SPIN_SPEED_OPTIONS.length - 1}
                          value={findClosestOptionIndex(SPIN_SPEED_OPTIONS, draft.spinSpeed)}
                          color={colors.accent.primary}
                          onValueChange={(nextValue) => {
                            const sliderIndex = Math.round(
                              clamp(nextValue, 0, SPIN_SPEED_OPTIONS.length - 1),
                            );
                            const spinSpeed = SPIN_SPEED_OPTIONS[sliderIndex] ?? draft.spinSpeed;
                            updateSpinSpeed(spinSpeed, false);
                          }}
                        />
                        <expoSwiftUI.Picker
                          label="Spin direction"
                          options={ROTATION_DIRECTION_OPTIONS.map((option) => option.label)}
                          selectedIndex={Math.max(
                            0,
                            ROTATION_DIRECTION_OPTIONS.findIndex(
                              (option) => option.value === draft.rotationDirection,
                            ),
                          )}
                          variant="segmented"
                          onOptionSelected={(event) => {
                            updateRotationDirection(
                              ROTATION_DIRECTION_OPTIONS[event.nativeEvent.index]?.value ?? "cw",
                            );
                          }}
                        />
                        <expoSwiftUI.LabeledContent label="Spin start angle">
                          <expoSwiftUI.Text>
                            {formatRotationStart(draft.rotationStartDeg)}
                          </expoSwiftUI.Text>
                        </expoSwiftUI.LabeledContent>
                        <expoSwiftUI.Slider
                          min={0}
                          max={ROTATION_START_OPTIONS.length - 1}
                          steps={ROTATION_START_OPTIONS.length - 1}
                          value={findClosestOptionIndex(
                            ROTATION_START_OPTIONS,
                            draft.rotationStartDeg,
                          )}
                          color={colors.accent.primary}
                          onValueChange={(nextValue) => {
                            const sliderIndex = Math.round(
                              clamp(nextValue, 0, ROTATION_START_OPTIONS.length - 1),
                            );
                            const rotationStartDeg =
                              ROTATION_START_OPTIONS[sliderIndex] ?? draft.rotationStartDeg;
                            updateRotationStartDeg(rotationStartDeg, false);
                          }}
                        />
                      </>
                    ) : null}

                    {activeControlTab === "media" ? (
                      <>
                        <expoSwiftUI.LabeledContent label="Audio">
                          <expoSwiftUI.Text>{audioLabel || "Current audio"}</expoSwiftUI.Text>
                        </expoSwiftUI.LabeledContent>
                        <expoSwiftUI.Button
                          systemImage="music.note"
                          onPress={onSwapAudio}
                        >
                          Change audio track
                        </expoSwiftUI.Button>
                        <expoSwiftUI.LabeledContent label="Photo">
                          <expoSwiftUI.Text>{photoLabel || "Current image"}</expoSwiftUI.Text>
                        </expoSwiftUI.LabeledContent>
                        <expoSwiftUI.Button
                          systemImage="photo"
                          onPress={onSwapPhoto}
                        >
                          Change photo
                        </expoSwiftUI.Button>
                      </>
                    ) : null}
                  </expoSwiftUI.Section>
                </expoSwiftUI.Form>
              </expoSwiftUI.Host>
            </View>
          ) : (
            <ScrollView
              style={styles.controlsScroll}
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.controlPanel}>
                <View style={styles.controlTabRowWrap}>
                  <ScrollView
                    horizontal
                    nestedScrollEnabled
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.controlTabRow}
                  >
                    {TEMPLATE_CONTROL_TABS.map((tab) => {
                      const selected = tab.id === activeControlTab;
                      return (
                        <Pressable
                          key={tab.id}
                          onPress={() => handleControlTabSelect(tab.id)}
                          style={({ pressed }) => [
                            styles.controlTabPill,
                            selected && styles.controlTabPillSelected,
                            pressed && styles.controlTabPillPressed,
                          ]}
                          accessibilityLabel={`Show ${tab.label}`}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                        >
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.controlTabPillText,
                              selected && styles.controlTabPillTextSelected,
                            ]}
                          >
                            {tab.label}
                          </Text>
                          <View
                            style={[
                              styles.controlTabUnderline,
                              selected && styles.controlTabUnderlineActive,
                            ]}
                          />
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                <View style={styles.controlPanelBody}>
              {activeControlTab === "layout" ? (
                <>
                  <View style={styles.controlSection}>
                    <View style={styles.controlHeader}>
                      <Text style={styles.controlLabel}>Template</Text>
                    </View>
                    <TemplateSwitcher
                      options={templateSwitcherOptions}
                      value={draftTemplateId}
                      onChange={handleTemplateSelect}
                    />
                  </View>

                  <View style={styles.controlSection}>
                    <View style={styles.controlHeader}>
                      <Text style={styles.controlLabel}>Aspect Ratio</Text>
                    </View>
                    <View style={styles.aspectRatioRow}>
                      {ASPECT_OPTIONS.map((option) => {
                        const selected = option === draftAspectRatio;
                        return (
                          <Pressable
                            key={`layout-aspect-${option}`}
                            onPress={() => handleAspectRatioSelect(option)}
                            style={[
                              styles.optionPill,
                              styles.aspectRatioOption,
                              selected && styles.optionPillSelected,
                            ]}
                            accessibilityLabel={`Aspect ratio ${option}`}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                          >
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

                </>
              ) : null}

              {activeControlTab === "background" ? (
                <>
                  <View style={styles.controlSection}>
                    <View style={styles.controlHeader}>
                      <Text style={styles.controlLabel}>Background</Text>
                    </View>
                    <ScrollView
                      horizontal
                      nestedScrollEnabled
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.backgroundRow}
                    >
                      <Pressable
                        onPress={handlePickBackgroundPhoto}
                        style={[
                          styles.backgroundSwatchWrap,
                          styles.photoBackgroundToggleWrap,
                          isBackgroundPhotoSelected && styles.backgroundSwatchWrapSelected,
                        ]}
                        accessibilityLabel="Add photo background"
                        accessibilityRole="button"
                        accessibilityState={{ selected: isBackgroundPhotoSelected }}
                      >
                        {isBackgroundPhotoLoading ? (
                          <ActivityIndicator size="small" color={colors.dark.text} />
                        ) : draft.stageBackgroundImageUri ? (
                          <RNImage
                            source={{ uri: draft.stageBackgroundImageUri }}
                            style={[styles.backgroundSwatch, styles.photoBackgroundThumb]}
                            resizeMode="cover"
                          />
                        ) : (
                          <View
                            style={[
                              styles.backgroundSwatch,
                              styles.photoBackgroundPlaceholder,
                            ]}
                          >
                            <Ionicons
                              name="image-outline"
                              size={14}
                              color={colors.dark.textSecondary}
                            />
                          </View>
                        )}
                      </Pressable>
                      <Pressable
                        onPress={() => toggleCustomColorEnabled(!isCustomColorEnabled)}
                        style={[
                          styles.backgroundSwatchWrap,
                          styles.customBackgroundToggleWrap,
                          isCustomColorEnabled && styles.backgroundSwatchWrapSelected,
                          { backgroundColor: "#ffffff" },
                        ]}
                        accessibilityLabel="Toggle custom background color"
                        accessibilityRole="button"
                        accessibilityState={{ selected: isCustomColorEnabled }}
                      >
                        <Ionicons
                          name="color-palette"
                          size={11}
                          color="#000000"
                          style={styles.customBackgroundToggleIcon}
                        />
                      </Pressable>
                      {backgroundOptions.map((option) => {
                        const selected = option.color === draft.stageBackgroundColor;
                        return (
                          <Pressable
                            key={option.id}
                            onPress={() => {
                              setIsCustomColorEnabled(false);
                              setLastPresetBackgroundColor(option.color);
                              updateBackground(option.color);
                            }}
                            style={[
                              styles.backgroundSwatchWrap,
                              selected && styles.backgroundSwatchWrapSelected,
                              { backgroundColor: option.swatch },
                            ]}
                            accessibilityLabel={`Background ${option.label}`}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                          />
                        );
                      })}
                    </ScrollView>
                    {isCustomColorEnabled ? (
                      <CustomColorPanel
                        hue={customHue}
                        saturation={customSaturation}
                        lightness={customLightness}
                        enabled={isCustomColorEnabled}
                        showToneOptions={showToneOptions}
                        onPaletteSelect={handleCustomPaletteSelect}
                        onToneSelect={handleCustomToneSelect}
                      />
                    ) : null}
                  </View>

                  {isBackgroundPhotoSelected ? (
                    <View style={styles.controlSection}>
                      <View style={styles.controlHeader}>
                        <Text style={styles.controlLabel}>Background Blur</Text>
                      </View>
                      <ScrollView
                        horizontal
                        nestedScrollEnabled
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.optionRow}
                      >
                        {BACKGROUND_BLUR_OPTIONS.map((option) => {
                          const selected = option === draft.backgroundBlur;
                          return (
                            <Pressable
                              key={`blur-${option}`}
                              onPress={() => updateBackgroundBlur(option)}
                              style={[styles.optionPill, selected && styles.optionPillSelected]}
                              accessibilityLabel={`Background blur ${formatBlur(option)}`}
                              accessibilityRole="button"
                              accessibilityState={{ selected }}
                            >
                              <Text
                                style={[
                                  styles.optionPillText,
                                  selected && styles.optionPillTextSelected,
                                ]}
                              >
                                {formatBlur(option)}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </View>
                  ) : null}

                  <View style={styles.controlSection}>
                    <View style={styles.controlHeader}>
                      <Text style={styles.controlLabel}>Watermark</Text>
                    </View>
                    <View style={styles.motionOptionRow}>
                      <Pressable
                        onPress={() => updateShowWatermark(true)}
                        style={[
                          styles.optionPill,
                          styles.motionOption,
                          draft.showWatermark && styles.optionPillSelected,
                        ]}
                        accessibilityLabel="Enable watermark"
                        accessibilityRole="button"
                        accessibilityState={{ selected: draft.showWatermark }}
                      >
                        <Text
                          style={[
                            styles.optionPillText,
                            draft.showWatermark && styles.optionPillTextSelected,
                          ]}
                        >
                          On
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => updateShowWatermark(false)}
                        style={[
                          styles.optionPill,
                          styles.motionOption,
                          !draft.showWatermark && styles.optionPillSelected,
                        ]}
                        accessibilityLabel="Disable watermark"
                        accessibilityRole="button"
                        accessibilityState={{ selected: !draft.showWatermark }}
                      >
                        <Text
                          style={[
                            styles.optionPillText,
                            !draft.showWatermark && styles.optionPillTextSelected,
                          ]}
                        >
                          Off
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </>
              ) : null}

              {activeControlTab === "quickTune" ? (
                <>
                  <View style={styles.controlSection}>
                    <View style={styles.controlHeader}>
                      <Text style={styles.controlLabel}>{recordSizeControlLabel}</Text>
                    </View>
                    <View style={styles.recordSizeRow}>
                      {RECORD_SIZE_OPTIONS.map((option) => {
                        const selected = option === draft.recordSize;
                        return (
                          <Pressable
                            key={`record-size-${option}`}
                            onPress={() => updateRecordSize(option)}
                            style={[
                              styles.optionPill,
                              styles.recordSizeOption,
                              selected && styles.optionPillSelected,
                            ]}
                            accessibilityLabel={`${recordSizeAccessibilityPrefix} ${formatRecordSize(option)}`}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                          >
                            <Text
                              style={[
                                styles.optionPillText,
                                selected && styles.optionPillTextSelected,
                              ]}
                            >
                              {formatRecordSize(option)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  {isVinylTemplate ? (
                    <View style={styles.controlSection}>
                      <View style={styles.controlHeader}>
                        <Text style={styles.controlLabel}>Artwork Size</Text>
                      </View>
                      <View style={styles.artworkSizeRow}>
                        {ARTWORK_SCALE_OPTIONS.map((option) => {
                          const selected =
                            option ===
                            (ARTWORK_SCALE_OPTIONS[
                              findClosestOptionIndex(
                                ARTWORK_SCALE_OPTIONS,
                                draft.artworkScale,
                              )
                            ] ?? draft.artworkScale);
                          return (
                            <Pressable
                              key={`artwork-size-${option}`}
                              onPress={() => updateArtworkScale(option)}
                              style={[
                                styles.optionPill,
                                styles.artworkSizeOption,
                                selected && styles.optionPillSelected,
                              ]}
                              accessibilityLabel={`Artwork size ${formatArtworkScale(option)} ${formatArtworkScalePercent(option)}`}
                              accessibilityRole="button"
                              accessibilityState={{ selected }}
                            >
                              <Text
                                style={[
                                  styles.optionPillText,
                                  selected && styles.optionPillTextSelected,
                                ]}
                              >
                                {formatArtworkScale(option)}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  ) : null}

                  <View style={styles.controlSection}>
                    <View style={styles.controlHeader}>
                      <Text style={styles.controlLabel}>Transparency</Text>
                    </View>
                    <ScrollView
                      horizontal
                      nestedScrollEnabled
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.optionRow}
                    >
                      {RECORD_TRANSPARENCY_OPTIONS.map((option) => {
                        const selected = option === draft.recordTransparency;
                        return (
                          <Pressable
                            key={String(option)}
                            onPress={() => updateRecordTransparency(option)}
                            style={[styles.optionPill, selected && styles.optionPillSelected]}
                            accessibilityLabel={`Transparency ${formatTransparency(option)}`}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                          >
                            <Text
                              style={[
                                styles.optionPillText,
                                selected && styles.optionPillTextSelected,
                              ]}
                            >
                              {formatTransparency(option)}
                            </Text>
                          </Pressable>
                        );
                      })}
                      </ScrollView>
                  </View>
                </>
              ) : null}

              {activeControlTab === "advancedMotion" ? (
                <>
                  <View style={styles.controlSection}>
                    <View style={styles.controlHeader}>
                      <Text style={styles.controlLabel}>Spin Speed</Text>
                    </View>
                    <ScrollView
                      horizontal
                      nestedScrollEnabled
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={[styles.optionRow, styles.spinSpeedRow]}
                    >
                      {SPIN_SPEED_OPTIONS.map((option) => {
                        const selected = option === draft.spinSpeed;
                        return (
                          <Pressable
                            key={String(option)}
                            onPress={() => updateSpinSpeed(option)}
                            style={[
                              styles.optionPill,
                              styles.spinSpeedOption,
                              selected && styles.optionPillSelected,
                            ]}
                            accessibilityLabel={`Spin speed ${formatSpeed(option)}`}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                          >
                            <Text
                              numberOfLines={1}
                              adjustsFontSizeToFit
                              minimumFontScale={0.9}
                              style={[
                                styles.optionPillText,
                                styles.spinSpeedOptionText,
                                selected && styles.optionPillTextSelected,
                              ]}
                            >
                              {formatSpeed(option)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>

                  <View style={styles.controlSection}>
                    <View style={styles.controlHeader}>
                      <Text style={styles.controlLabel}>Spin Start Angle</Text>
                    </View>
                    <View style={styles.motionOptionRow}>
                      {ROTATION_START_OPTIONS.map((option) => {
                        const selected = option === draft.rotationStartDeg;
                        return (
                          <Pressable
                            key={`start-angle-${option}`}
                            onPress={() => updateRotationStartDeg(option)}
                            style={[
                              styles.optionPill,
                              styles.motionOption,
                              selected && styles.optionPillSelected,
                            ]}
                            accessibilityLabel={`Spin start angle ${formatRotationStart(option)}`}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                          >
                            <Text
                              style={[
                                styles.optionPillText,
                                selected && styles.optionPillTextSelected,
                              ]}
                            >
                              {formatRotationStart(option)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.controlSection}>
                    <View style={styles.controlHeader}>
                      <Text style={styles.controlLabel}>Spin Direction</Text>
                    </View>
                    <View style={styles.motionOptionRow}>
                      {ROTATION_DIRECTION_OPTIONS.map((option) => {
                        const selected = option.value === draft.rotationDirection;
                        return (
                          <Pressable
                            key={option.value}
                            onPress={() => updateRotationDirection(option.value)}
                            style={[
                              styles.optionPill,
                              styles.motionOption,
                              selected && styles.optionPillSelected,
                            ]}
                            accessibilityLabel={`Spin direction ${option.label}`}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                          >
                            <Text
                              style={[
                                styles.optionPillText,
                                selected && styles.optionPillTextSelected,
                              ]}
                            >
                              {option.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                </>
              ) : null}

              {activeControlTab === "media" ? (
                <View style={styles.controlSection}>
                  <View style={styles.controlHeader}>
                    <Text style={styles.controlLabel}>Audio & Photo</Text>
                  </View>
                  <Pressable
                    onPress={onSwapAudio}
                    style={styles.mediaActionRow}
                    accessibilityLabel="Change audio"
                    accessibilityRole="button"
                  >
                    <View style={styles.mediaActionLeft}>
                      <Ionicons
                        name="musical-notes-outline"
                        size={17}
                        color={colors.accent.primary}
                      />
                      <View style={styles.mediaActionTextWrap}>
                        <Text style={styles.mediaActionTitle}>Change Audio Track</Text>
                        <Text style={styles.mediaActionMeta} numberOfLines={1}>
                          {audioLabel || "Current audio"}
                        </Text>
                      </View>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={17}
                      color={colors.dark.textSecondary}
                    />
                  </Pressable>
                  <Pressable
                    onPress={onSwapPhoto}
                    style={styles.mediaActionRow}
                    accessibilityLabel="Change photo"
                    accessibilityRole="button"
                  >
                    <View style={styles.mediaActionLeft}>
                      <Ionicons
                        name="camera-outline"
                        size={17}
                        color={colors.accent.primary}
                      />
                      <View style={styles.mediaActionTextWrap}>
                        <Text style={styles.mediaActionTitle}>Change Photo</Text>
                        <Text style={styles.mediaActionMeta} numberOfLines={1}>
                          {photoLabel || "Current image"}
                        </Text>
                      </View>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={17}
                      color={colors.dark.textSecondary}
                    />
                  </Pressable>
                </View>
              ) : null}
                </View>
              </View>
            </ScrollView>
          )}

        <View style={styles.footer}>
          <Pressable
            onPress={() =>
              onApply({
                tweaks: draft,
                aspectRatio: draftAspectRatio,
                templateId: draftTemplateId,
              })
            }
            style={({ pressed }) => [
              styles.applyButton,
              pressed && styles.applyButtonPressed,
            ]}
            accessibilityLabel="Apply template controls"
            accessibilityRole="button"
          >
            <View style={styles.applyButtonContent}>
              <Text style={styles.applyButtonText}>Apply Changes</Text>
            </View>
          </Pressable>
        </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: "transparent",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
  },
  sheetAnimatedLayer: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  root: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  topGestureZone: {
    backgroundColor: colors.dark.background,
  },
  headerGestureArea: {
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.22)",
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
  previewContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  controlsScroll: {
    flex: 1,
  },
  nativeControlsWrap: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  nativeControlsHost: {
    flex: 1,
    backgroundColor: colors.dark.background,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  controlPanel: {
    borderRadius: radius.lg,
    borderWidth: 0,
    borderColor: "transparent",
    backgroundColor: "transparent",
    overflow: "visible",
  },
  controlTabRowWrap: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    backgroundColor: "transparent",
    marginHorizontal: -spacing.lg,
  },
  controlTabRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  controlPanelBody: {
    paddingHorizontal: 0,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    gap: spacing.md,
  },
  controlTabPill: {
    flex: 1,
    minHeight: 36,
    minWidth: 0,
    borderRadius: radius.sm,
    borderWidth: 0,
    borderColor: "transparent",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: 3,
  },
  controlTabPillSelected: {
    borderColor: "transparent",
    backgroundColor: "transparent",
  },
  controlTabPillPressed: {
    opacity: 0.7,
  },
  controlTabPillText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.dark.textSecondary,
    fontWeight: "600",
    letterSpacing: 0.08,
    textAlign: "center",
  },
  controlTabPillTextSelected: {
    color: colors.dark.text,
    fontWeight: "700",
  },
  controlTabUnderline: {
    marginTop: 6,
    width: "100%",
    height: 2,
    borderRadius: radius.full,
    backgroundColor: "transparent",
  },
  controlTabUnderlineActive: {
    backgroundColor: colors.accent.primary,
  },
  previewCard: {
    minHeight: 300,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  previewTemplateInfoBadge: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.xs,
    right: spacing.xs,
  },
  controlSection: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
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
    textTransform: "none",
    letterSpacing: 0.16,
    fontWeight: "600",
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  recordSizeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    width: "100%",
  },
  artworkSizeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    width: "100%",
  },
  motionOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    width: "100%",
  },
  spinSpeedRow: {
    paddingRight: 0,
  },
  aspectRatioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    width: "100%",
  },
  optionPill: {
    minHeight: 36,
    minWidth: 66,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  aspectRatioOption: {
    flex: 1,
    minWidth: 0,
  },
  recordSizeOption: {
    flex: 1,
    minWidth: 0,
  },
  artworkSizeOption: {
    flex: 1,
    minWidth: 0,
  },
  motionOption: {
    flex: 1,
    minWidth: 0,
  },
  spinSpeedOption: {
    flexGrow: 0,
    flexShrink: 0,
    minWidth: 74,
    paddingHorizontal: spacing.sm,
  },
  optionPillSelected: {
    borderColor: colors.accent.primary,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  optionPillText: {
    ...typography.caption,
    color: colors.dark.textSecondary,
    fontWeight: "600",
    letterSpacing: 0.12,
  },
  spinSpeedOptionText: {
    textAlign: "center",
  },
  optionPillTextSelected: {
    color: colors.dark.text,
    fontWeight: "700",
  },
  mediaActionRow: {
    minHeight: 54,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mediaActionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  mediaActionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  mediaActionTitle: {
    ...typography.caption,
    color: colors.dark.text,
    fontWeight: "600",
  },
  mediaActionMeta: {
    ...typography.caption,
    color: colors.dark.textSecondary,
    marginTop: 1,
  },
  backgroundRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  backgroundSwatchWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    borderWidth: 0,
    borderColor: "transparent",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  backgroundSwatchWrapSelected: {
    borderWidth: 2,
    borderColor: colors.accent.primary,
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
  },
  backgroundSwatch: {
    width: "100%",
    height: "100%",
    borderRadius: radius.md,
  },
  customBackgroundToggleWrap: {
    borderWidth: 0,
    borderColor: "transparent",
  },
  customBackgroundToggleIcon: {
    position: "absolute",
  },
  photoBackgroundToggleWrap: {
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
  },
  photoBackgroundPlaceholder: {
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoBackgroundThumb: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  customColorCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: spacing.sm,
    gap: spacing.sm,
  },
  customColorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  customColorTitle: {
    ...typography.caption,
    color: colors.dark.text,
    fontWeight: "700",
  },
  customColorSwatch: {
    width: 16,
    height: 16,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  customHueHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: spacing.sm,
  },
  customHueLabel: {
    ...typography.caption,
    color: colors.dark.textSecondary,
    fontWeight: "600",
    textTransform: "none",
    letterSpacing: 0.16,
  },
  paletteStripScroll: {
    marginHorizontal: -spacing.xs,
  },
  paletteStripWrap: {
    gap: spacing.xs,
  },
  paletteStripRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  paletteSection: {
    gap: spacing.xs,
  },
  paletteSectionLabel: {
    ...typography.caption,
    color: colors.dark.textSecondary,
    fontWeight: "600",
    fontSize: 11,
    letterSpacing: 0.14,
    textTransform: "none",
    paddingHorizontal: spacing.xs,
  },
  paletteSectionSwatches: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  paletteSectionDivider: {
    marginTop: spacing.xs,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginHorizontal: spacing.xs,
  },
  paletteDotWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    borderWidth: 0,
    borderColor: "transparent",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  paletteDotWrapSelected: {
    borderWidth: 2,
    borderColor: colors.accent.primary,
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
  },
  paletteDotWrapDisabled: {
    opacity: 0.42,
  },
  paletteDot: {
    width: "100%",
    height: "100%",
    borderRadius: radius.md,
  },
  palettePager: {
    flexDirection: "row",
    alignSelf: "center",
    alignItems: "center",
    gap: spacing.xs,
    paddingTop: 2,
  },
  palettePagerDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.24)",
  },
  palettePagerDotActive: {
    width: 16,
    backgroundColor: colors.accent.primary,
  },
  customToneRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  customToneSwatchWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    borderWidth: 0,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  customToneSwatchWrapSelected: {
    borderWidth: 2,
    borderColor: colors.accent.primary,
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
  },
  customToneSwatch: {
    width: "100%",
    height: "100%",
    borderRadius: radius.md,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  applyButton: {
    minHeight: 54,
    borderRadius: radius.full,
    backgroundColor: colors.accent.primary,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    paddingHorizontal: spacing.md,
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  applyButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  applyButtonContent: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  applyButtonText: {
    ...typography.button,
    color: colors.accent.onPrimary,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
