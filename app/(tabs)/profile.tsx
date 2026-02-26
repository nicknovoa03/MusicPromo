import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../convex/_generated/api";
import { colors, typography, spacing, radius } from "@/constants/tokens";
import { getExpoPushTokenAsync } from "@/lib/notifications";

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { user: clerkUser } = useUser();
  const convexUser = useQuery(api.users.current);
  const removePushToken = useMutation(api.pushTokens.removeForCurrentUser);

  const displayName =
    convexUser?.name ?? clerkUser?.fullName ?? "Guest";
  const displayEmail =
    convexUser?.email ??
    clerkUser?.primaryEmailAddress?.emailAddress ??
    "No email";
  const isGuest = convexUser?.isGuest ?? !clerkUser?.primaryEmailAddress;

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            const expoPushToken = await getExpoPushTokenAsync({
              requestPermission: false,
            });
            if (expoPushToken) {
              await removePushToken({ expoPushToken });
            }
          } catch (error) {
            console.warn("Failed to remove push token on sign out:", error);
          }

          try {
            await signOut();
          } catch {
            Alert.alert("Error", "Failed to sign out. Please try again.");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={36} color={colors.dark.textSecondary} />
        </View>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.email}>{displayEmail}</Text>
        {isGuest && (
          <View style={styles.guestBadge}>
            <Text style={styles.guestBadgeText}>Guest Account</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>

        <SettingsRow
          icon="resize-outline"
          label="Default Aspect Ratio"
          value={convexUser?.preferences?.defaultAspectRatio ?? "9:16"}
        />
        <SettingsRow
          icon="time-outline"
          label="Default Video Length"
          value="15s"
        />

        <View style={styles.divider} />

        <Pressable
          style={({ pressed }) => [
            styles.settingsRow,
            pressed && styles.settingsRowPressed,
          ]}
          onPress={handleSignOut}
          accessibilityLabel="Sign out"
          accessibilityRole="button"
        >
          <View style={styles.settingsRowLeft}>
            <Ionicons
              name="log-out-outline"
              size={22}
              color={colors.accent.error}
            />
            <Text style={[styles.settingsLabel, { color: colors.accent.error }]}>
              Sign Out
            </Text>
          </View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function SettingsRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.settingsRow,
        pressed && styles.settingsRowPressed,
      ]}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <View style={styles.settingsRowLeft}>
        <Ionicons name={icon} size={22} color={colors.dark.textSecondary} />
        <Text style={styles.settingsLabel}>{label}</Text>
      </View>
      <View style={styles.settingsRowRight}>
        <Text style={styles.settingsValue}>{value}</Text>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.dark.textSecondary}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.dark.text,
  },
  profileCard: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: colors.dark.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  name: {
    ...typography.h2,
    color: colors.dark.text,
    marginBottom: spacing.xs,
  },
  email: {
    ...typography.body,
    color: colors.dark.textSecondary,
  },
  guestBadge: {
    marginTop: spacing.sm,
    backgroundColor: colors.dark.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  guestBadgeText: {
    ...typography.caption,
    color: colors.dark.textSecondary,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.dark.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  settingsRowPressed: {
    backgroundColor: colors.dark.surface,
  },
  settingsRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  settingsRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  settingsLabel: {
    ...typography.body,
    color: colors.dark.text,
  },
  settingsValue: {
    ...typography.body,
    color: colors.dark.textSecondary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.dark.border,
    marginVertical: spacing.sm,
  },
});
