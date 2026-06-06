import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors, radius, typography } from "@/constants/tokens";
import { pressScaleStyle } from "@/lib/pressFeedback";

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
};

export function OnboardingPrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  accessibilityLabel,
}: Props) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        isDisabled && styles.buttonDisabled,
        pressScaleStyle(pressed && !isDisabled),
      ]}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.accent.onPrimary} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent.fill,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  label: {
    ...typography.button,
    color: colors.accent.onFill,
  },
});
