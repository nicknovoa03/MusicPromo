import { StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, radius, spacing, typography } from "@/constants/tokens";

type Props = {
  eyebrow: string;
  title: string;
  body: string;
  icon?: keyof typeof Ionicons.glyphMap;
  chips?: readonly string[];
};

export function OnboardingStorySlide({
  eyebrow,
  title,
  body,
  icon = "sparkles-outline",
  chips,
}: Props) {
  return (
    <View style={styles.slide}>
      <View style={styles.card}>
        <View style={styles.iconShell}>
          <Ionicons name={icon} size={32} color={colors.light.text} />
        </View>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>

        {chips && chips.length > 0 ? (
          <View style={styles.chipRow}>
            {chips.map((chip) => (
              <View key={chip} style={styles.chip}>
                <Text style={styles.chipText}>{chip}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
  },
  card: {
    backgroundColor: colors.overlay.lightStrong,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.overlay.lightStrong,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
    minHeight: 430,
    shadowColor: "#0F2B1A",
    shadowOpacity: 0.09,
    shadowOffset: { width: 0, height: 18 },
    shadowRadius: 24,
    elevation: 8,
  },
  iconShell: {
    width: 68,
    height: 68,
    borderRadius: radius.full,
    backgroundColor: colors.accent.primaryMuted,
    borderWidth: 1,
    borderColor: colors.brand.tintStrong,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  eyebrow: {
    ...typography.caption,
    color: colors.light.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
    fontWeight: "600",
  },
  title: {
    ...typography.h1,
    color: colors.light.text,
    marginBottom: spacing.md,
    lineHeight: 36,
  },
  body: {
    ...typography.body,
    color: colors.light.textSecondary,
    lineHeight: 24,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  chipText: {
    ...typography.caption,
    color: colors.light.text,
    fontWeight: "600",
  },
});
