import { useMemo } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius, spacing, typography } from "@/constants/tokens";
import { getTemplateDefinition, type TemplateTweaks } from "@/lib/templates";

interface TemplateInfoBadgeProps {
  templateId: string;
  templateTweaks: TemplateTweaks;
  aspectRatio: "9:16" | "4:5" | "1:1";
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

function formatNumber(value: number, fractionDigits = 2): string {
  const fixed = value.toFixed(fractionDigits);
  return fixed.replace(/\.?0+$/, "");
}

export function TemplateInfoBadge({
  templateId,
  templateTweaks,
  aspectRatio,
  compact = false,
  style,
}: TemplateInfoBadgeProps) {
  const templateName = getTemplateDefinition(templateId).name;
  const spinSpeed = `${formatNumber(templateTweaks.spinSpeed)}x`;
  const size = `${Math.round(templateTweaks.recordSize * 100)}%`;
  const transparency = `${Math.round(templateTweaks.recordTransparency * 100)}%`;
  const blur = templateTweaks.backgroundBlur <= 0
    ? "off"
    : `${Math.round(templateTweaks.backgroundBlur)}px`;
  const angle = `${Math.round(templateTweaks.rotationStartDeg)}deg`;
  const direction = templateTweaks.rotationDirection.toUpperCase();
  const background = templateTweaks.stageBackgroundImageUri
    ? "photo"
    : templateTweaks.stageBackgroundColor ?? "default";

  const chips = useMemo(
    () => [
      `SPD ${spinSpeed}`,
      `SIZ ${size}`,
      `TRN ${transparency}`,
      `BLR ${blur}`,
      `ANG ${angle} ${direction}`,
      `BG ${background}`,
    ],
    [angle, background, blur, direction, size, spinSpeed, transparency],
  );

  return (
    <View style={[styles.badge, compact && styles.badgeCompact, style]} pointerEvents="none">
      <Text style={styles.title}>
        {templateName} • {aspectRatio}
      </Text>
      <View style={styles.chipRow}>
        {chips.map((chip) => (
          <View key={chip} style={styles.chip}>
            <Text style={styles.chipText} numberOfLines={1}>
              {chip}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(8,10,16,0.68)",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    maxWidth: "92%",
  },
  badgeCompact: {
    maxWidth: "96%",
  },
  title: {
    ...typography.caption,
    color: colors.dark.text,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  chip: {
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  chipText: {
    ...typography.caption,
    color: colors.dark.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
