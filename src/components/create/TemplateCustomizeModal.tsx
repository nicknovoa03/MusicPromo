import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image as RNImage,
  Modal,
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
import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { toByteArray } from "base64-js";
import { TemplateInfoBadge } from "@/components/create/TemplateInfoBadge";
import { colors, radius, spacing, typography } from "@/constants/tokens";
import { persistPickedMediaFile } from "@/lib/mediaStorage";
import { getTemplateDefinition, type TemplateTweaks } from "@/lib/templates";

interface TemplateCustomizeModalProps {
  visible: boolean;
  templateId: string;
  photoUri?: string | null;
  value: TemplateTweaks;
  showTemplateInfo?: boolean;
  onClose: () => void;
  onApply: (next: TemplateTweaks) => void;
}

interface BackgroundOption {
  id: string;
  label: string;
  color: string | null;
  swatch: string;
}

function isPresetBackgroundColor(
  color: string | null | undefined,
  options: BackgroundOption[],
): boolean {
  return options.some((option) => option.color === (color ?? null));
}

const SPIN_SPEED_OPTIONS = [0.6, 0.8, 1, 1.25, 1.5];
const RECORD_TRANSPARENCY_OPTIONS = [0, 0.15, 0.3, 0.45, 0.6];
const BACKGROUND_BLUR_OPTIONS = [0, 2, 4, 8, 12, 18];
const ROTATION_START_OPTIONS = [0, 90, 180, 270];
const ROTATION_DIRECTION_OPTIONS: Array<{
  label: string;
  value: "cw" | "ccw";
}> = [
  { label: "CW", value: "cw" },
  { label: "CCW", value: "ccw" },
];
const DEFAULT_CUSTOM_SATURATION = 68;
const CUSTOM_LIGHTNESS_MIN = 8;
const CUSTOM_LIGHTNESS_MAX = 94;
const DEFAULT_CUSTOM_HUE = 252;
const DEFAULT_CUSTOM_LIGHTNESS = 34;
const CUSTOM_TONE_OPTIONS = [14, 32, 50, 68, 86];
const STAGE_HORIZONTAL_PADDING = spacing.sm * 2;
const DEFAULT_BACKGROUND_OPTIONS: BackgroundOption[] = [
  { id: "default", label: "Default", color: null, swatch: "#080A12" },
  { id: "indigo", label: "Indigo", color: "#14142d", swatch: "#35357a" },
  { id: "midnight", label: "Midnight", color: "#0a0f1c", swatch: "#1d2f58" },
  { id: "charcoal", label: "Charcoal", color: "#111114", swatch: "#37373e" },
  { id: "sunset", label: "Sunset", color: "#211121", swatch: "#8f3f7d" },
];

function formatSpeed(value: number): string {
  return `${value.toFixed(value % 1 === 0 ? 0 : 2)}x`;
}

function formatTransparency(value: number): string {
  return `${Math.round(clamp(value, 0, 1) * 100)}%`;
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

interface PaletteSwatch {
  id: string;
  label: string;
  h: number;
  s: number;
  l: number;
  hex: string;
}

interface PaletteSection {
  id: string;
  label: string;
  swatches: PaletteSwatch[];
}

function buildPaletteSwatches(
  prefix: string,
  hues: number[],
  saturation: number,
  lightness: number,
): PaletteSwatch[] {
  return hues.map((hue) => ({
    id: `${prefix}-${hue}`,
    label: `${Math.round(hue)}deg`,
    h: hue,
    s: saturation,
    l: lightness,
    hex: hslToHex(hue, saturation, lightness),
  }));
}

const PRIMARY_PALETTE_HUES = [0, 22, 42, 62, 90, 118, 145, 176, 205, 232, 262, 292, 322];
const SECONDARY_PALETTE_HUES = [8, 30, 52, 74, 102, 130, 158, 186, 214, 242, 272, 302, 332];
const GRAYSCALE_LIGHTNESS_STOPS = [8, 14, 22, 30, 38, 46, 56, 66, 76, 84, 90, 96];
const SOFT_PALETTE_SATURATION_STOPS = [34, 30, 28, 32, 30, 28, 30, 32, 30, 28, 30, 32, 34];
const SOFT_PALETTE_LIGHTNESS_STOPS = [72, 74, 76, 73, 75, 77, 74, 72, 73, 75, 74, 72, 71];

const PALETTE_SECTIONS: PaletteSection[] = [
  {
    id: "core",
    label: "Palette A",
    swatches: buildPaletteSwatches("core", PRIMARY_PALETTE_HUES, 86, 52),
  },
  {
    id: "studio",
    label: "Palette B",
    swatches: SECONDARY_PALETTE_HUES.map((hue, index) => {
      const saturation = SOFT_PALETTE_SATURATION_STOPS[index] ?? 30;
      const lightness = SOFT_PALETTE_LIGHTNESS_STOPS[index] ?? 74;
      return {
        id: `studio-${hue}`,
        label: `${Math.round(hue)}deg`,
        h: hue,
        s: saturation,
        l: lightness,
        hex: hslToHex(hue, saturation, lightness),
      };
    }),
  },
  {
    id: "gray",
    label: "Grayscale",
    swatches: GRAYSCALE_LIGHTNESS_STOPS.map((lightness) => ({
      id: `gray-${lightness}`,
      label: `Gray ${lightness}`,
      h: 0,
      s: 0,
      l: lightness,
      hex: hslToHex(0, 0, lightness),
    })),
  },
];

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

function hueDistance(a: number, b: number): number {
  const delta = Math.abs(a - b) % 360;
  return Math.min(delta, 360 - delta);
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const red = clamp(r, 0, 255) / 255;
  const green = clamp(g, 0, 255) / 255;
  const blue = clamp(b, 0, 255) / 255;

  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;
  const saturation =
    delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  let hue = 0;
  if (delta !== 0) {
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  return {
    h: hue,
    s: saturation * 100,
    l: lightness * 100,
  };
}

async function buildPhotoMatchedBackgroundOptions(photoUri: string) {
  try {
    const thumbhash = await ExpoImage.generateThumbhashAsync(photoUri);
    if (!thumbhash) return null;

    const hashBytes = toByteArray(thumbhash.replace(/\\/g, "/"));
    if (hashBytes.length < 6) return null;

    // Thumbhash header contains the average LPQ color; decode it into average RGBA.
    const header = hashBytes[0] | (hashBytes[1] << 8) | (hashBytes[2] << 16);
    const lChannel = (header & 63) / 63;
    const pChannel = ((header >> 6) & 63) / 31.5 - 1;
    const qChannel = ((header >> 12) & 63) / 31.5 - 1;
    const hasAlpha = header >> 23;
    const alpha = hasAlpha ? (hashBytes[5] & 15) / 15 : 1;
    const bChannel = lChannel - (2 / 3) * pChannel;
    const rChannel = (3 * lChannel - bChannel + qChannel) / 2;
    const gChannel = rChannel - qChannel;
    const avgRgb = {
      r: Math.round(clamp(rChannel, 0, 1) * 255),
      g: Math.round(clamp(gChannel, 0, 1) * 255),
      b: Math.round(clamp(bChannel, 0, 1) * 255),
      a: clamp(alpha, 0, 1),
    };
    if (avgRgb.a <= 0) return null;

    const { h: baseHue, s: averageSaturation, l: averageLightness } = rgbToHsl(
      avgRgb.r,
      avgRgb.g,
      avgRgb.b,
    );

    if (averageSaturation < 16) {
      const baseline = clamp(averageLightness, 30, 64);
      const grayscaleStops = [baseline - 28, baseline - 16, baseline - 8, baseline + 2].map(
        (stop) => clamp(stop, 6, 44),
      );
      return [
        DEFAULT_BACKGROUND_OPTIONS[0],
        ...grayscaleStops.map((stop, index) => ({
          ...DEFAULT_BACKGROUND_OPTIONS[index + 1],
          color: hslToHex(0, 0, stop),
          swatch: hslToHex(0, 0, clamp(stop + 20, 22, 76)),
        })),
      ];
    }

    const livelySaturation = clamp(averageSaturation * 1.22 + 18, 34, 98);
    const primary = {
      h: baseHue,
      s: livelySaturation,
      l: clamp(averageLightness, 18, 78),
    };
    const secondary = {
      h: (baseHue + 22) % 360,
      s: clamp(livelySaturation * 0.9, 30, 88),
      l: clamp(averageLightness + 5, 20, 80),
    };
    const tertiary = {
      h: (baseHue + 46) % 360,
      s: clamp(livelySaturation * 0.8, 26, 82),
      l: clamp(averageLightness + 2, 18, 78),
    };
    const neutral = {
      h: baseHue,
      s: clamp(averageSaturation * 0.55 + 14, 18, 56),
      l: clamp(averageLightness - 4, 20, 72),
    };
    const seeds = [primary, secondary, tertiary, neutral];
    const backgroundLightnessStops = [12, 18, 24, 30];
    const saturationScales = [0.9, 0.86, 0.82, 0.7];

    return [
      DEFAULT_BACKGROUND_OPTIONS[0],
      ...seeds.map((seed, index) => {
        const backgroundSaturation = clamp(
          seed.s * saturationScales[index] + 10,
          28,
          92,
        );
        const backgroundLightness = clamp(
          backgroundLightnessStops[index] + (seed.l - 50) * 0.12,
          8,
          42,
        );
        return {
          ...DEFAULT_BACKGROUND_OPTIONS[index + 1],
          color: hslToHex(seed.h, backgroundSaturation, backgroundLightness),
          swatch: hslToHex(
            seed.h,
            clamp(backgroundSaturation + 14, 40, 98),
            clamp(backgroundLightness + 22, 24, 74),
          ),
        };
      }),
    ];
  } catch {
    return null;
  }
}

interface PaletteStripProps {
  hue: number;
  saturation: number;
  lightness: number;
  disabled?: boolean;
  onSelect: (swatch: PaletteSwatch) => void;
}

function PaletteStrip({
  hue,
  saturation,
  lightness,
  disabled = false,
  onSelect,
}: PaletteStripProps) {
  const normalizedHue = ((hue % 360) + 360) % 360;

  const isSelected = useCallback(
    (swatch: PaletteSwatch) => {
      if (swatch.s <= 2) {
        return saturation <= 8 && Math.abs(lightness - swatch.l) <= 4;
      }
      return (
        hueDistance(normalizedHue, swatch.h) <= 10 &&
        Math.abs(saturation - swatch.s) <= 16
      );
    },
    [lightness, normalizedHue, saturation],
  );

  return (
    <ScrollView
      horizontal
      nestedScrollEnabled
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.paletteStripRow}
      style={styles.paletteStripScroll}
    >
      {PALETTE_SECTIONS.map((section, sectionIndex) => (
        <View key={section.id} style={styles.paletteSection}>
          <Text style={styles.paletteSectionLabel}>{section.label}</Text>
          <View style={styles.paletteSectionSwatches}>
            {section.swatches.map((swatch) => {
              const selected = isSelected(swatch);
              return (
                <Pressable
                  key={swatch.id}
                  onPress={() => onSelect(swatch)}
                  disabled={disabled}
                  style={[
                    styles.paletteDotWrap,
                    selected && styles.paletteDotWrapSelected,
                    disabled && styles.paletteDotWrapDisabled,
                  ]}
                  accessibilityLabel={`${section.label} ${swatch.label}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled }}
                >
                  <View
                    style={[
                      styles.paletteDot,
                      { backgroundColor: swatch.hex },
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>
          {sectionIndex < PALETTE_SECTIONS.length - 1 ? (
            <View style={styles.paletteSectionDivider} />
          ) : null}
        </View>
      ))}
    </ScrollView>
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
  showTemplateInfo = true,
  onClose,
  onApply,
}: TemplateCustomizeModalProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [draft, setDraft] = useState<TemplateTweaks>(value);
  const [customHue, setCustomHue] = useState(DEFAULT_CUSTOM_HUE);
  const [customSaturation, setCustomSaturation] = useState(DEFAULT_CUSTOM_SATURATION);
  const [customLightness, setCustomLightness] = useState(DEFAULT_CUSTOM_LIGHTNESS);
  const [isCustomColorEnabled, setIsCustomColorEnabled] = useState(false);
  const [isBackgroundPhotoLoading, setIsBackgroundPhotoLoading] = useState(false);
  const [lastPresetBackgroundColor, setLastPresetBackgroundColor] = useState<
    string | null
  >(null);
  const [backgroundOptions, setBackgroundOptions] = useState<BackgroundOption[]>(
    DEFAULT_BACKGROUND_OPTIONS,
  );
  const customColor = useMemo(
    () => hslToHex(customHue, customSaturation, customLightness),
    [customHue, customSaturation, customLightness],
  );

  useEffect(() => {
    const nextPhotoUri = photoUri?.trim();
    if (!nextPhotoUri) {
      setBackgroundOptions(DEFAULT_BACKGROUND_OPTIONS);
      return;
    }

    let isActive = true;
    void buildPhotoMatchedBackgroundOptions(nextPhotoUri).then((matchedOptions) => {
      if (!isActive) return;
      setBackgroundOptions(matchedOptions ?? DEFAULT_BACKGROUND_OPTIONS);
    });
    return () => {
      isActive = false;
    };
  }, [photoUri]);

  useEffect(() => {
    if (!visible) return;
    setDraft(value);
    const hasBackgroundPhoto = Boolean(value.stageBackgroundImageUri);
    const isPreset = isPresetBackgroundColor(
      value.stageBackgroundColor,
      backgroundOptions,
    );
    setIsCustomColorEnabled(
      !hasBackgroundPhoto && Boolean(value.stageBackgroundColor && !isPreset),
    );
    setLastPresetBackgroundColor(isPreset ? value.stageBackgroundColor ?? null : null);

    const parsed = value.stageBackgroundColor
      ? hexToHsl(value.stageBackgroundColor)
      : null;
    if (parsed) {
      setCustomHue(parsed.h);
      setCustomSaturation(clamp(parsed.s, 0, 100));
      setCustomLightness(
        clamp(parsed.l, CUSTOM_LIGHTNESS_MIN, CUSTOM_LIGHTNESS_MAX),
      );
      return;
    }
    setCustomHue(DEFAULT_CUSTOM_HUE);
    setCustomSaturation(DEFAULT_CUSTOM_SATURATION);
    setCustomLightness(DEFAULT_CUSTOM_LIGHTNESS);
  }, [value, visible]);

  const isBackgroundPhotoSelected = Boolean(draft.stageBackgroundImageUri);
  const TemplateStageComponent = getTemplateDefinition(templateId).StageComponent;
  const previewStageSize = Math.min(
    windowWidth - STAGE_HORIZONTAL_PADDING,
    windowHeight * 0.66,
    520,
  );
  const selectedRotationDirectionLabel =
    ROTATION_DIRECTION_OPTIONS.find(
      (option) => option.value === draft.rotationDirection,
    )?.label ?? "CW";

  const updateSpinSpeed = useCallback((spinSpeed: number) => {
    if (spinSpeed === draft.spinSpeed) return;
    setDraft((prev) => ({ ...prev, spinSpeed }));
    void triggerSelectionHaptic();
  }, [draft.spinSpeed]);

  const updateRecordTransparency = useCallback((recordTransparency: number) => {
    if (recordTransparency === draft.recordTransparency) return;
    setDraft((prev) => ({ ...prev, recordTransparency }));
    void triggerSelectionHaptic();
  }, [draft.recordTransparency]);

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

        <ScrollView
          style={styles.controlsScroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
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

                <View style={styles.customHueHeader}>
                  <Text style={styles.customHueLabel}>Palette</Text>
                  <Text style={styles.customHueValue}>
                    Sat {Math.round(customSaturation)}%
                  </Text>
                </View>
                <PaletteStrip
                  hue={customHue}
                  saturation={customSaturation}
                  lightness={customLightness}
                  disabled={!isCustomColorEnabled}
                  onSelect={handleCustomPaletteSelect}
                />

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

          {isBackgroundPhotoSelected ? (
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
          ) : null}

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
              <Text style={styles.controlLabel}>Record Transparency</Text>
              <Text style={styles.controlValue}>
                {formatTransparency(draft.recordTransparency)}
              </Text>
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
                    accessibilityLabel={`Record transparency ${Math.round(option * 100)}%`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Text
                      style={[
                        styles.optionPillText,
                        selected && styles.optionPillTextSelected,
                      ]}
                    >
                      {`${Math.round(option * 100)}%`}
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
          </View>

          <View style={styles.controlSection}>
            <View style={styles.controlHeader}>
              <Text style={styles.controlLabel}>Spin Direction</Text>
              <Text style={styles.controlValue}>{selectedRotationDirectionLabel}</Text>
            </View>
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
  customHueHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  customHueLabel: {
    ...typography.caption,
    color: colors.dark.textSecondary,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.35,
  },
  customHueValue: {
    ...typography.caption,
    color: colors.dark.text,
    fontWeight: "700",
  },
  paletteStripScroll: {
    marginHorizontal: -spacing.xs,
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
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: "uppercase",
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
    backgroundColor: "rgba(255,255,255,0.12)",
    marginHorizontal: spacing.xs,
  },
  paletteDotWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  paletteDotWrapSelected: {
    borderColor: colors.dark.text,
    transform: [{ scale: 1.08 }],
  },
  paletteDotWrapDisabled: {
    opacity: 0.42,
  },
  paletteDot: {
    width: 18,
    height: 18,
    borderRadius: radius.full,
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
