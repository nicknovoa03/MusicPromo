import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "@/constants/tokens";

export interface TemplateSwitcherOption {
  id: string;
  name: string;
}

interface TemplateSwitcherProps {
  options: TemplateSwitcherOption[];
  value: string;
  onChange: (value: string) => void;
}

export function TemplateSwitcher({
  options,
  value,
  onChange,
}: TemplateSwitcherProps) {
  return (
    <View style={styles.root}>
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <Pressable
            key={option.id}
            onPress={() => onChange(option.id)}
            style={({ pressed }) => [
              styles.option,
              selected && styles.optionSelected,
              pressed && !selected && styles.optionPressed,
            ]}
            accessibilityLabel={`Template ${option.name}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
              {option.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.dark.surface,
    borderRadius: radius.full,
    padding: 2,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  option: {
    minHeight: 32,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  optionSelected: {
    backgroundColor: "#FFFFFF",
  },
  optionPressed: {
    opacity: 0.85,
  },
  optionText: {
    ...typography.caption,
    color: colors.dark.textSecondary,
    fontWeight: "600",
  },
  optionTextSelected: {
    color: colors.dark.background,
    fontWeight: "700",
  },
});
