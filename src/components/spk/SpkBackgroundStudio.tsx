import { useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, spacing, radius } from "@/constants/tokens";
import { BackgroundPresetRow } from "@/components/create/background/BackgroundPresetRow";
import { backgroundControlStyles } from "@/components/create/background/backgroundStyles";
import type { BackgroundOption } from "@/components/create/background/types";

export type SpkColorPreset = BackgroundOption;

export const SPK_EDITORIAL_PRESETS: SpkColorPreset[] = [
  { id: "midnight", color: "#0E1014", swatch: "#4A4A55", label: "Midnight" },
  { id: "navy", color: "#0D1526", swatch: "#2563EB", label: "Navy" },
  { id: "forest", color: "#0C1A10", swatch: "#16A34A", label: "Forest" },
  { id: "bordeaux", color: "#1C0C12", swatch: "#BE123C", label: "Bordeaux" },
  { id: "espresso", color: "#18120A", swatch: "#B45309", label: "Espresso" },
];

type SpkBackgroundStudioProps = {
  coverImageUri: string | null;
  innerBackgroundUri: string | null;
  themeColor: string;
  backgroundOptions: BackgroundOption[];
  hasCustomCover: boolean;
  isPickingCover: boolean;
  isPickingInner: boolean;
  onPickCover: () => void;
  onPickInner: () => void;
  onUseCoverForInner: () => void;
  onClearInnerPhoto: () => void;
  onResetCoverToArtwork: () => void;
  onSelectColor: (color: string) => void;
};

function ImageSlot({
  label,
  subtitle,
  imageUri,
  placeholderColor,
  placeholderIcon,
  selected,
  loading,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  subtitle: string;
  imageUri: string | null;
  placeholderColor: string;
  placeholderIcon: keyof typeof Ionicons.glyphMap;
  selected?: boolean;
  loading?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.imageSlot,
        selected && styles.imageSlotSelected,
        pressed && styles.imageSlotPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.imageSlotPhoto} resizeMode="cover" />
      ) : (
        <View style={[styles.imageSlotPlaceholder, { backgroundColor: placeholderColor }]}>
          <Ionicons name={placeholderIcon} size={22} color="rgba(255,255,255,0.55)" />
        </View>
      )}
      <View style={styles.imageSlotFooter}>
        <Text style={styles.imageSlotLabel}>{label}</Text>
        <Text style={styles.imageSlotSubtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <View style={styles.imageSlotEditBadge}>
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Ionicons name="camera-outline" size={14} color="#FFFFFF" />
        )}
      </View>
    </Pressable>
  );
}

export function SpkBackgroundStudio({
  coverImageUri,
  innerBackgroundUri,
  themeColor,
  backgroundOptions,
  hasCustomCover,
  isPickingCover,
  isPickingInner,
  onPickCover,
  onPickInner,
  onUseCoverForInner,
  onClearInnerPhoto,
  onResetCoverToArtwork,
  onSelectColor,
}: SpkBackgroundStudioProps) {
  const innerUsesPhoto = Boolean(innerBackgroundUri);
  const showColorPresets = !innerUsesPhoto;
  const handleSelectPreset = useCallback(
    (color: string | null) => {
      if (!color) return;
      onSelectColor(color);
    },
    [onSelectColor],
  );

  const toneHint = innerUsesPhoto
    ? "Tint behind inner photos"
    : "Tone for slides 2–4";

  const quickActions = useMemo(() => {
    const actions: Array<{
      id: string;
      label: string;
      icon: keyof typeof Ionicons.glyphMap;
      onPress: () => void;
      accessibilityLabel: string;
    }> = [
      {
        id: "match-cover",
        label: "Match cover",
        icon: "copy-outline",
        onPress: onUseCoverForInner,
        accessibilityLabel: "Use cover image on slides 2 through 4",
      },
    ];

    if (innerUsesPhoto) {
      actions.push({
        id: "color-only",
        label: "Color only",
        icon: "color-palette-outline",
        onPress: onClearInnerPhoto,
        accessibilityLabel: "Use solid color on slides 2 through 4",
      });
    }

    if (hasCustomCover) {
      actions.push({
        id: "use-artwork",
        label: "Use artwork",
        icon: "refresh-outline",
        onPress: onResetCoverToArtwork,
        accessibilityLabel: "Reset cover to track artwork",
      });
    }

    return actions;
  }, [
    hasCustomCover,
    innerUsesPhoto,
    onClearInnerPhoto,
    onResetCoverToArtwork,
    onUseCoverForInner,
  ]);

  return (
    <View style={styles.card}>
      <View style={backgroundControlStyles.controlSection}>
        <View style={backgroundControlStyles.controlHeader}>
          <Text style={backgroundControlStyles.controlLabel}>Background</Text>
        </View>

        <View style={styles.imageRow}>
          <ImageSlot
            label="Cover"
            subtitle="Slide 1"
            imageUri={coverImageUri}
            placeholderColor={colors.dark.surfaceMuted}
            placeholderIcon="image-outline"
            onPress={onPickCover}
            loading={isPickingCover}
            accessibilityLabel="Change cover slide image"
          />
          <ImageSlot
            label="Inner slides"
            subtitle="2–4"
            imageUri={innerBackgroundUri}
            placeholderColor={themeColor}
            placeholderIcon="color-fill-outline"
            selected={innerUsesPhoto}
            loading={isPickingInner}
            onPress={onPickInner}
            accessibilityLabel="Change background for slides 2 through 4"
          />
        </View>

        {quickActions.length > 0 ? (
          <View
            style={[
              styles.quickActionsRow,
              quickActions.length === 1 && styles.quickActionsRowSolo,
            ]}
          >
            {quickActions.map((action) => (
              <Pressable
                key={action.id}
                onPress={action.onPress}
                style={({ pressed }) => [
                  styles.quickAction,
                  quickActions.length === 1 && styles.quickActionSolo,
                  pressed && styles.quickActionPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={action.accessibilityLabel}
              >
                <Ionicons name={action.icon} size={15} color={colors.dark.text} />
                <Text style={styles.quickActionText} numberOfLines={1}>
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {showColorPresets ? (
          <>
            <Text style={backgroundControlStyles.controlHint}>{toneHint}</Text>
            <BackgroundPresetRow
              options={backgroundOptions}
              selectedColor={themeColor}
              isCustomColorEnabled={false}
              showCustomToggle={false}
              colorAppliesWhenPhotoSelected
              innerUsesPhoto={innerUsesPhoto}
              onSelectPreset={handleSelectPreset}
            />
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.dark.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dark.border,
  },
  imageRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  imageSlot: {
    flex: 1,
    height: 88,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.dark.surfaceMuted,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  imageSlotSelected: {
    borderColor: "rgba(255,255,255,0.45)",
  },
  imageSlotPressed: {
    opacity: 0.92,
  },
  imageSlotPhoto: {
    ...StyleSheet.absoluteFillObject,
  },
  imageSlotPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  imageSlotFooter: {
    position: "absolute",
    left: spacing.sm,
    right: spacing.sm,
    bottom: 7,
    gap: 1,
  },
  imageSlotLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.85)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  imageSlotSubtitle: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255,255,255,0.82)",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  imageSlotEditBadge: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  quickActionsRowSolo: {
    justifyContent: "center",
  },
  quickAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.dark.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dark.border,
  },
  quickActionSolo: {
    flexGrow: 0,
    flexShrink: 1,
    minWidth: "52%",
    maxWidth: 240,
  },
  quickActionPressed: {
    opacity: 0.88,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.dark.text,
    letterSpacing: -0.1,
  },
});
