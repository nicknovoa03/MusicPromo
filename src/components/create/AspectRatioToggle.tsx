import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, typography, spacing, radius } from "@/constants/tokens";

export type AspectRatio = "9:16" | "1:1";

interface AspectRatioToggleProps {
  value: AspectRatio;
  onChange: (value: AspectRatio) => void;
}

const OPTIONS: AspectRatio[] = ["9:16", "1:1"];

export function AspectRatioToggle({ value, onChange }: AspectRatioToggleProps) {
  return (
    <View style={styles.container}>
      {OPTIONS.map((option) => {
        const active = option === value;
        return (
          <Pressable
            key={option}
            style={[styles.option, active && styles.optionActive]}
            onPress={() => onChange(option)}
            accessibilityLabel={`Aspect ratio ${option}`}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
          >
            <View
              style={[
                styles.preview,
                option === "9:16" ? styles.preview916 : styles.preview11,
                active && styles.previewActive,
              ]}
            />
            <Text style={[styles.label, active && styles.labelActive]}>
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.dark.surface,
  },
  optionActive: {
    backgroundColor: colors.accent.primary,
  },
  preview: {
    borderRadius: 2,
    borderWidth: 1.5,
    borderColor: colors.dark.textSecondary,
  },
  preview916: {
    width: 9,
    height: 14,
  },
  preview11: {
    width: 12,
    height: 12,
  },
  previewActive: {
    borderColor: colors.dark.text,
  },
  label: {
    ...typography.caption,
    color: colors.dark.textSecondary,
  },
  labelActive: {
    color: colors.dark.text,
    fontWeight: "600",
  },
});
