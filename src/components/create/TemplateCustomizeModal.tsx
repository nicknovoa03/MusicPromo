import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { colors, radius, spacing, typography } from "@/constants/tokens";
import { persistPickedMediaFile } from "@/lib/mediaStorage";
import { getTemplateDefinition, type TemplateTweaks } from "@/lib/templates";

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

function isPresetBackgroundColor(color: string | null | undefined): boolean {
  return BACKGROUND_OPTIONS.some((option) => option.color === (color ?? null));
}

const SPIN_SPEED_OPTIONS = [0.6, 0.8, 1, 1.25, 1.5];
const RECORD_OPACITY_OPTIONS = [0.55, 0.7, 0.85, 1];
const BACKGROUND_BLUR_OPTIONS = [0, 2, 4, 8, 12, 18];
const ROTATION_START_OPTIONS = [-120, -60, 0, 60, 120, 180];
const ROTATION_DIRECTION_OPTIONS: Array<{
  label: string;
  value: "cw" | "ccw";
}> = [
  { label: "CW", value: "cw" },
  { label: "CCW", value: "ccw" },
];
const CUSTOM_COLOR_SATURATION = 68;
const CUSTOM_LIGHTNESS_MIN = 8;
const CUSTOM_LIGHTNESS_MAX = 42;
const DEFAULT_CUSTOM_HUE = 252;
const DEFAULT_CUSTOM_LIGHTNESS = 18;
const CUSTOM_TONE_OPTIONS = [12, 18, 26, 34];
const COLOR_WHEEL_SIZE = 164;
const COLOR_WHEEL_DOT_SIZE = 10;
const COLOR_WHEEL_SEGMENTS = 72;
const COLOR_WHEEL_RING_THICKNESS = 24;
const COLOR_WHEEL_MARKER_SIZE = 20;
const STAGE_HORIZONTAL_PADDING = spacing.sm * 2;
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

function formatBlur(value: number): string {
  return value <= 0 ? "Off" : `${value}px`;
}

function formatRotationStart(value: number): string {
  if (value === 0) return "0deg";
  return `${value > 0 ? "+" : ""}${value}deg`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 100) / 100;
  const light = clamp(l, 0, 100) / 100;
  const chroma = (1 - Math.abs(2 * light - 1)) * sat;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const match = light - chroma / 2;

  let red = 0;
  let green = 0;
  let blue = 0;
  if (hue < 60) {
    red = chroma;
    green = x;
  } else if (hue < 120) {
    red = x;
    green = chroma;
  } else if (hue < 180) {
    green = chroma;
    blue = x;
  } else if (hue < 240) {
    green = x;
    blue = chroma;
  } else if (hue < 300) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  const toHex = (value: number) =>
    Math.round((value + match) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const normalized = hex.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  const r = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const g = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const b = Number.parseInt(normalized.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 2;
  const saturation =
    delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  let hue = 0;
  if (delta !== 0) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  return {
    h: hue,
    s: saturation * 100,
    l: lightness * 100,
  };
}

interface ColorWheelProps {
  hue: number;
  disabled?: boolean;
  onChange: (nextHue: number) => void;
}

function ColorWheel({ hue, disabled = false, onChange }: ColorWheelProps) {
  const center = COLOR_WHEEL_SIZE / 2;
  const outerRadius = center - 6;
  const innerRadius = outerRadius - COLOR_WHEEL_RING_THICKNESS;
  const ringRadius = (outerRadius + innerRadius) / 2;
  const markerHue = ((hue % 360) + 360) % 360;
  const markerAngle = (markerHue * Math.PI) / 180;
  const markerX = center + Math.cos(markerAngle) * ringRadius;
  const markerY = center + Math.sin(markerAngle) * ringRadius;

  const wheelDots = useMemo(
    () =>
      Array.from({ length: COLOR_WHEEL_SEGMENTS }, (_, index) => {
        const dotHue = (index / COLOR_WHEEL_SEGMENTS) * 360;
        const angle = (dotHue * Math.PI) / 180;
        const x = center + Math.cos(angle) * ringRadius - COLOR_WHEEL_DOT_SIZE / 2;
        const y = center + Math.sin(angle) * ringRadius - COLOR_WHEEL_DOT_SIZE / 2;
        return {
          key: `dot-${index}`,
          color: hslToHex(dotHue, 90, 56),
          x,
          y,
        };
      }),
    [center, ringRadius],
  );

  const updateHueFromPoint = useCallback(
    (x: number, y: number) => {
      const dx = x - center;
      const dy = y - center;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < innerRadius - 12 || distance > outerRadius + 12) return;
      const nextHue = (((Math.atan2(dy, dx) * 180) / Math.PI) + 360) % 360;
      onChange(nextHue);
    },
    [center, innerRadius, onChange, outerRadius],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          !disabled && (Math.abs(gestureState.dx) > 1 || Math.abs(gestureState.dy) > 1),
        onPanResponderGrant: (event) =>
          updateHueFromPoint(
            event.nativeEvent.locationX,
            event.nativeEvent.locationY,
          ),
        onPanResponderMove: (event) =>
          updateHueFromPoint(
            event.nativeEvent.locationX,
            event.nativeEvent.locationY,
          ),
        onPanResponderTerminationRequest: () => false,
      }),
    [disabled, updateHueFromPoint],
  );

  return (
    <View
      style={[styles.colorWheelTouch, disabled && styles.colorWheelTouchDisabled]}
      {...panResponder.panHandlers}
    >
      <View style={[styles.colorWheelWrap, disabled && styles.colorWheelWrapDisabled]}>
        {wheelDots.map((dot) => (
          <View
            key={dot.key}
            style={[
              styles.colorWheelDot,
              {
                backgroundColor: dot.color,
                left: dot.x,
                top: dot.y,
              },
            ]}
          />
        ))}
        <View
          style={[
            styles.colorWheelMarker,
            {
              borderColor: hslToHex(markerHue, 100, 70),
              left: markerX - COLOR_WHEEL_MARKER_SIZE / 2,
              top: markerY - COLOR_WHEEL_MARKER_SIZE / 2,
            },
          ]}
        />
      </View>
    </View>
  );
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
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [draft, setDraft] = useState<TemplateTweaks>(value);
  const [customHue, setCustomHue] = useState(DEFAULT_CUSTOM_HUE);
  const [customLightness, setCustomLightness] = useState(DEFAULT_CUSTOM_LIGHTNESS);
  const [isCustomColorEnabled, setIsCustomColorEnabled] = useState(false);
  const [isBackgroundPhotoLoading, setIsBackgroundPhotoLoading] = useState(false);
  const [lastPresetBackgroundColor, setLastPresetBackgroundColor] = useState<
    string | null
  >(null);
  const customColor = useMemo(
    () => hslToHex(customHue, CUSTOM_COLOR_SATURATION, customLightness),
    [customHue, customLightness],
  );

  useEffect(() => {
    if (!visible) return;
    setDraft(value);
    const hasBackgroundPhoto = Boolean(value.stageBackgroundImageUri);
    const isPreset = isPresetBackgroundColor(value.stageBackgroundColor);
    setIsCustomColorEnabled(
      !hasBackgroundPhoto && Boolean(value.stageBackgroundColor && !isPreset),
    );
    setLastPresetBackgroundColor(isPreset ? value.stageBackgroundColor ?? null : null);

    const parsed = value.stageBackgroundColor
      ? hexToHsl(value.stageBackgroundColor)
      : null;
    if (parsed) {
      setCustomHue(parsed.h);
      setCustomLightness(
        clamp(parsed.l, CUSTOM_LIGHTNESS_MIN, CUSTOM_LIGHTNESS_MAX),
      );
      return;
    }
    setCustomHue(DEFAULT_CUSTOM_HUE);
    setCustomLightness(DEFAULT_CUSTOM_LIGHTNESS);
  }, [value, visible]);

  const isCustomBackgroundSelected = useMemo(
    () =>
      Boolean(
        draft.stageBackgroundColor &&
          !BACKGROUND_OPTIONS.some(
            (option) => option.color === draft.stageBackgroundColor,
          ),
      ),
    [draft.stageBackgroundColor],
  );

  const selectedBackground = useMemo(
    () =>
      BACKGROUND_OPTIONS.find((option) => option.color === draft.stageBackgroundColor) ??
      BACKGROUND_OPTIONS[0],
    [draft.stageBackgroundColor],
  );
  const isBackgroundPhotoSelected = Boolean(draft.stageBackgroundImageUri);
  const TemplateStageComponent = getTemplateDefinition(templateId).StageComponent;
  const previewStageSize = Math.min(
    windowWidth - STAGE_HORIZONTAL_PADDING,
    windowHeight * 0.66,
    520,
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

  const updateBackgroundBlur = useCallback((backgroundBlur: number) => {
    if (backgroundBlur === draft.backgroundBlur) return;
    setDraft((prev) => ({ ...prev, backgroundBlur }));
    void triggerSelectionHaptic();
  }, [draft.backgroundBlur]);

  const updateRotationStartDeg = useCallback((rotationStartDeg: number) => {
    if (rotationStartDeg === draft.rotationStartDeg) return;
    setDraft((prev) => ({ ...prev, rotationStartDeg }));
    void triggerSelectionHaptic();
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
        if (current && isPresetBackgroundColor(current)) {
          setLastPresetBackgroundColor(current);
        }
        updateBackground(customColor);
        return;
      }

      const fallback = lastPresetBackgroundColor ?? null;
      updateBackground(fallback);
    },
    [customColor, draft.stageBackgroundColor, lastPresetBackgroundColor, updateBackground],
  );

  const handleCustomHueChange = useCallback(
    (nextHue: number) => {
      const clampedHue = clamp(nextHue, 0, 360);
      setCustomHue(clampedHue);
      if (!isCustomColorEnabled) return;
      updateBackground(
        hslToHex(clampedHue, CUSTOM_COLOR_SATURATION, customLightness),
        false,
      );
    },
    [customLightness, isCustomColorEnabled, updateBackground],
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
        hslToHex(customHue, CUSTOM_COLOR_SATURATION, clampedLightness),
        false,
      );
    },
    [customHue, isCustomColorEnabled, updateBackground],
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      allowSwipeDismissal={false}
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
            />
          </View>
        </View>

        <ScrollView
          style={styles.controlsScroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.controlSection}>
            <View style={styles.controlHeader}>
              <Text style={styles.controlLabel}>Background</Text>
              <Text style={styles.controlValue}>
                {draft.stageBackgroundImageUri
                  ? "Photo"
                  : isCustomBackgroundSelected
                    ? "Custom"
                    : selectedBackground.label}
              </Text>
            </View>
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.backgroundRow}
            >
              {BACKGROUND_OPTIONS.map((option) => {
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
              <Pressable
                onPress={() => toggleCustomColorEnabled(!isCustomColorEnabled)}
                style={[
                  styles.backgroundSwatchWrap,
                  styles.customBackgroundToggleWrap,
                  isCustomColorEnabled && styles.backgroundSwatchWrapSelected,
                ]}
                accessibilityLabel="Toggle custom background color"
                accessibilityRole="button"
                accessibilityState={{ selected: isCustomColorEnabled }}
              >
                <View
                  style={[
                    styles.backgroundSwatch,
                    styles.customBackgroundToggleInner,
                    { backgroundColor: customColor },
                  ]}
                />
                <Ionicons
                  name="color-palette"
                  size={11}
                  color="#ffffff"
                  style={styles.customBackgroundToggleIcon}
                />
              </Pressable>
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
                  <Image
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
            </ScrollView>
            {isCustomColorEnabled ? (
              <View style={styles.customColorCard}>
                <View style={styles.customColorHeader}>
                  <Text style={styles.customColorTitle}>Custom Color</Text>
                  <View style={styles.customColorInfo}>
                    <View
                      style={[
                        styles.customColorSwatch,
                        { backgroundColor: customColor },
                      ]}
                    />
                    <Text style={styles.customColorHex}>{customColor.toUpperCase()}</Text>
                  </View>
                </View>

                <View style={styles.customWheelRow}>
                  <ColorWheel hue={customHue} onChange={handleCustomHueChange} />
                </View>

                <ScrollView
                  horizontal
                  nestedScrollEnabled
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.customToneRow}
                >
                  {CUSTOM_TONE_OPTIONS.map((tone) => {
                    const selected = tone === customLightness;
                    return (
                      <Pressable
                        key={`tone-${tone}`}
                        onPress={() => handleCustomToneSelect(tone)}
                        style={[styles.customTonePill, selected && styles.customTonePillSelected]}
                        accessibilityLabel={`Color tone ${tone}`}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                      >
                        <Text
                          style={[
                            styles.customToneText,
                            selected && styles.customToneTextSelected,
                          ]}
                        >
                          Tone {tone}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}
          </View>

          <View style={styles.controlSection}>
            <View style={styles.controlHeader}>
              <Text style={styles.controlLabel}>Background Blur</Text>
              <Text style={styles.controlValue}>
                {formatBlur(draft.backgroundBlur)}
              </Text>
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

          <View style={styles.controlSection}>
            <View style={styles.controlHeader}>
              <Text style={styles.controlLabel}>Spin Speed</Text>
              <Text style={styles.controlValue}>{formatSpeed(draft.spinSpeed)}</Text>
            </View>
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.optionRow}
            >
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
            </ScrollView>
          </View>

          <View style={styles.controlSection}>
            <View style={styles.controlHeader}>
              <Text style={styles.controlLabel}>Record Opacity</Text>
              <Text style={styles.controlValue}>
                {formatOpacity(draft.recordOpacity)}
              </Text>
            </View>
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.optionRow}
            >
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
            </ScrollView>
          </View>

          <View style={styles.controlSection}>
            <View style={styles.controlHeader}>
              <Text style={styles.controlLabel}>Spin Start Angle</Text>
              <Text style={styles.controlValue}>
                {formatRotationStart(draft.rotationStartDeg)}
              </Text>
            </View>
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.optionRow}
            >
              {ROTATION_START_OPTIONS.map((option) => {
                const selected = option === draft.rotationStartDeg;
                return (
                  <Pressable
                    key={`start-angle-${option}`}
                    onPress={() => updateRotationStartDeg(option)}
                    style={[styles.optionPill, selected && styles.optionPillSelected]}
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
            </ScrollView>
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.optionRow}
            >
              {ROTATION_DIRECTION_OPTIONS.map((option) => {
                const selected = option.value === draft.rotationDirection;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => updateRotationDirection(option.value)}
                    style={[styles.optionPill, selected && styles.optionPillSelected]}
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
            </ScrollView>
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
  previewContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  controlsScroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  previewCard: {
    minHeight: 300,
    alignItems: "center",
    justifyContent: "center",
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
    flexWrap: "nowrap",
    alignItems: "center",
    gap: spacing.sm,
    paddingRight: spacing.lg,
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
    flexWrap: "nowrap",
    alignItems: "center",
    gap: spacing.sm,
    paddingRight: spacing.lg,
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
  customBackgroundToggleWrap: {
    borderColor: "rgba(255,255,255,0.3)",
  },
  customBackgroundToggleInner: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.42)",
  },
  customBackgroundToggleIcon: {
    position: "absolute",
  },
  photoBackgroundToggleWrap: {
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
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.04)",
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
  customColorInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  customColorSwatch: {
    width: 16,
    height: 16,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  customColorHex: {
    ...typography.caption,
    color: colors.dark.textSecondary,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  customWheelRow: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xs,
  },
  colorWheelTouch: {
    width: COLOR_WHEEL_SIZE,
    height: COLOR_WHEEL_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  colorWheelTouchDisabled: {
    opacity: 0.42,
  },
  colorWheelWrap: {
    width: COLOR_WHEEL_SIZE,
    height: COLOR_WHEEL_SIZE,
    borderRadius: COLOR_WHEEL_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  colorWheelWrapDisabled: {
    borderColor: "rgba(255,255,255,0.04)",
  },
  colorWheelDot: {
    position: "absolute",
    width: COLOR_WHEEL_DOT_SIZE,
    height: COLOR_WHEEL_DOT_SIZE,
    borderRadius: COLOR_WHEEL_DOT_SIZE / 2,
  },
  colorWheelMarker: {
    position: "absolute",
    width: COLOR_WHEEL_MARKER_SIZE,
    height: COLOR_WHEEL_MARKER_SIZE,
    borderRadius: radius.full,
    borderWidth: 2.5,
    backgroundColor: "rgba(8,10,16,0.86)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    pointerEvents: "none",
  },
  customToneRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    gap: spacing.xs,
    paddingRight: spacing.sm,
  },
  customToneRowDisabled: {
    opacity: 0.5,
  },
  customTonePill: {
    minHeight: 30,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.03)",
    alignItems: "center",
    justifyContent: "center",
  },
  customTonePillSelected: {
    borderColor: colors.accent.primary,
    backgroundColor: colors.accent.primary,
  },
  customToneText: {
    ...typography.caption,
    color: colors.dark.textSecondary,
    fontWeight: "700",
    fontSize: 11,
  },
  customToneTextSelected: {
    color: colors.dark.text,
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
