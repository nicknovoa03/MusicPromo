import { View, Text, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, spacing, radius } from "@/constants/tokens";

export default function CreateScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Create</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [
              styles.mediaButton,
              pressed && styles.mediaButtonPressed,
            ]}
            disabled
            accessibilityLabel="Select a photo"
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
          >
            <View style={styles.mediaIconContainer}>
              <Ionicons
                name="image-outline"
                size={32}
                color={colors.accent.primary}
              />
            </View>
            <Text style={styles.mediaLabel}>Add Photo</Text>
            <Text style={styles.mediaHint}>Select from camera roll</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [
              styles.mediaButton,
              pressed && styles.mediaButtonPressed,
            ]}
            disabled
            accessibilityLabel="Select an audio file"
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
          >
            <View style={styles.mediaIconContainer}>
              <Ionicons
                name="musical-note-outline"
                size={32}
                color={colors.accent.primary}
              />
            </View>
            <Text style={styles.mediaLabel}>Add Audio</Text>
            <Text style={styles.mediaHint}>MP3, WAV, or M4A</Text>
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.previewButton,
            pressed && styles.previewButtonPressed,
          ]}
          accessibilityLabel="Preview video"
          accessibilityRole="button"
          disabled
        >
          <Text style={styles.previewButtonText}>Preview</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.light.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.light.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  mediaButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  mediaButtonPressed: {
    opacity: 0.7,
  },
  mediaIconContainer: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.light.background,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  mediaLabel: {
    ...typography.button,
    color: colors.light.text,
    marginBottom: spacing.xs,
  },
  mediaHint: {
    ...typography.caption,
    color: colors.light.textSecondary,
  },
  previewButton: {
    backgroundColor: colors.accent.primary,
    height: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.md,
    opacity: 0.4,
  },
  previewButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  previewButtonText: {
    ...typography.button,
    color: "#FFFFFF",
  },
});
