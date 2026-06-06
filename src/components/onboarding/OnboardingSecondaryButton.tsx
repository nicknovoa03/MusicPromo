import { Pressable, StyleSheet, Text } from "react-native";
import { colors, typography, spacing } from "@/constants/tokens";
import { pressScaleStyle, PRESS_SCALE_SUBTLE } from "@/lib/pressFeedback";

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export function OnboardingSecondaryButton({
  label,
  onPress,
  disabled = false,
  accessibilityLabel,
}: Props) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        disabled && styles.buttonDisabled,
        pressScaleStyle(pressed && !disabled, PRESS_SCALE_SUBTLE),
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  label: {
    ...typography.body,
    color: colors.light.textSecondary,
    fontWeight: "600",
  },
});
