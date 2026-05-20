import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, typography, spacing } from "@/constants/tokens";

type FlyerFlowHeaderProps = {
  title: string;
  stepLabel: string;
  onBack: () => void;
  onExit: () => void;
  showBackButton?: boolean;
  exitAccessibilityLabel?: string;
  isSaving?: boolean;
  /** Match the screen background — details is light, editor/export are dark. */
  tone?: "light" | "dark";
};

export function FlyerFlowHeader({
  title,
  stepLabel,
  onBack,
  onExit,
  showBackButton = true,
  exitAccessibilityLabel = "Save and exit",
  isSaving = false,
  tone = "dark",
}: FlyerFlowHeaderProps) {
  const palette = tone === "light" ? colors.light : colors.dark;
  const text = palette.text;
  const secondary = palette.textSecondary;
  const surface = palette.surface;

  return (
    <View style={styles.header}>
      {showBackButton ? (
        <Pressable
          style={styles.sideButton}
          onPress={onBack}
          accessibilityLabel="Go back one step"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={22} color={text} />
        </Pressable>
      ) : (
        <View style={styles.sideButton} />
      )}
      <Text style={[styles.headerTitle, { color: text }]} numberOfLines={1}>
        {title}
      </Text>
      <Text style={[styles.stepLabel, { color: secondary }]}>{stepLabel}</Text>
      <Pressable
        style={[styles.closeButton, { backgroundColor: surface }]}
        onPress={onExit}
        disabled={isSaving}
        accessibilityLabel={exitAccessibilityLabel}
        accessibilityRole="button"
      >
        {isSaving ? (
          <ActivityIndicator size="small" color={text} />
        ) : (
          <Ionicons name="close" size={18} color={text} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  sideButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -spacing.xs,
  },
  headerTitle: {
    ...typography.body,
    fontWeight: "600",
    flex: 1,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
});
