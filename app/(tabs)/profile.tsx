import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { usePostHog } from "posthog-react-native";
import { api } from "../../convex/_generated/api";
import { colors, typography, spacing, radius } from "@/constants/tokens";
import {
  DEFAULT_LOCAL_PROFILE_PREFERENCES,
  setLocalProfilePreferences,
  getLocalProfilePreferences,
} from "@/lib/localProfile";
import { clearLocalOnboardingCompleted } from "@/lib/onboarding";
import { getExpoPushTokenAsync } from "@/lib/notifications";
import type { EventName } from "@/lib/analytics";
import { useLocalSession } from "@/providers/localSession";
import { sleep } from "@/lib/utils";

type AspectRatio = "9:16" | "1:1";
const ASPECT_RATIO_OPTIONS: AspectRatio[] = ["9:16", "1:1"];
const VIDEO_LENGTH_OPTIONS = [15, 30, 60] as const;

export default function ProfileScreen() {
  const router = useRouter();
  const { signOut, getToken, userId, isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const { isAuthenticated, isLoading: isConvexAuthLoading } = useConvexAuth();
  const { isLocalGuest, clearLocalSession } = useLocalSession();
  const posthog = usePostHog();
  const convexUser = useQuery(api.users.current);
  const getOrCreateUser = useMutation(api.users.getOrCreate);
  const updateProfile = useMutation(api.users.updateProfile);
  const softDeleteCurrent = useMutation(api.users.softDeleteCurrent);
  const removePushToken = useMutation(api.pushTokens.removeForCurrentUser);

  const [savingPreference, setSavingPreference] = useState<
    "aspectRatio" | "videoLength" | null
  >(null);
  const [isBootstrappingUser, setIsBootstrappingUser] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [localPreferences, setLocalPreferences] = useState(
    DEFAULT_LOCAL_PROFILE_PREFERENCES
  );
  const [isLocalPreferencesReady, setIsLocalPreferencesReady] = useState(false);

  useEffect(() => {
    let isActive = true;
    setIsLocalPreferencesReady(false);

    (async () => {
      const prefs = await getLocalProfilePreferences();
      if (!isActive) return;
      setLocalPreferences(prefs);
      setIsLocalPreferencesReady(true);
    })();

    return () => {
      isActive = false;
    };
  }, []);

  const usesLocalProfile = isLocalGuest || !isSignedIn;
  const isConvexUnavailableForSignedIn = Boolean(isSignedIn) && !isAuthenticated;

  const isLoading = usesLocalProfile
    ? !isLocalPreferencesReady
    : isConvexUnavailableForSignedIn
      ? false
      : convexUser === undefined || isBootstrappingUser || isConvexAuthLoading;
  const isGuest = usesLocalProfile
    ? true
    : convexUser?.isGuest ?? !clerkUser?.primaryEmailAddress;
  const displayName = usesLocalProfile
    ? "Guest"
    : convexUser?.name ?? clerkUser?.fullName ?? "Guest";
  const displayEmail = usesLocalProfile
    ? "Local-only session"
    : convexUser?.email ?? clerkUser?.primaryEmailAddress?.emailAddress ?? "No email";

  const selectedAspectRatio = useMemo<AspectRatio>(() => {
    if (usesLocalProfile) return localPreferences.defaultAspectRatio;
    return convexUser?.preferences?.defaultAspectRatio ?? "9:16";
  }, [
    usesLocalProfile,
    localPreferences.defaultAspectRatio,
    convexUser?.preferences?.defaultAspectRatio,
  ]);

  const selectedVideoLength = useMemo(() => {
    if (usesLocalProfile) return localPreferences.defaultVideoLength;
    const value = convexUser?.preferences?.defaultVideoLength;
    if (value === 30 || value === 60) return value;
    return 15;
  }, [
    usesLocalProfile,
    localPreferences.defaultVideoLength,
    convexUser?.preferences?.defaultVideoLength,
  ]);

  const track = useCallback(
    (event: EventName, props?: Record<string, string>) => {
      posthog?.capture(event, props);
    },
    [posthog],
  );

  const removePushTokenForCurrentDevice = useCallback(async () => {
    try {
      const expoPushToken = await getExpoPushTokenAsync({
        requestPermission: false,
      });
      if (!expoPushToken) return;
      await removePushToken({ expoPushToken });
    } catch (error) {
      console.warn("Failed to remove push token:", error);
    }
  }, [removePushToken]);

  const isUnauthenticatedError = useCallback((error: unknown) => {
    const message = error instanceof Error ? error.message : "";
    return message.includes("Unauthenticated");
  }, []);

  const isMissingConvexTemplateError = useCallback((error: unknown) => {
    const message = error instanceof Error ? error.message : "";
    return (
      message.includes("MissingConvexTemplate") ||
      message.includes("No JWT template exists with name: convex")
    );
  }, []);

  const ensureUserRecord = useCallback(async (currentConvexUser: typeof convexUser) => {
    const convexToken = await getToken({ template: "convex" });
    if (!convexToken) {
      throw new Error("MissingConvexTemplate");
    }

    if (currentConvexUser) return;

    setIsBootstrappingUser(true);
    try {
      let lastError: unknown = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          await getOrCreateUser({});
          return;
        } catch (error) {
          lastError = error;
          if (isUnauthenticatedError(error) && attempt < 2) {
            await sleep(350);
            continue;
          }
          throw error;
        }
      }
      if (lastError) throw lastError;
    } finally {
      setIsBootstrappingUser(false);
    }
  }, [getOrCreateUser, getToken, isUnauthenticatedError]);

  const savePreference = useCallback(
    async (params: {
      savingKey: "aspectRatio" | "videoLength";
      setting: "defaultAspectRatio" | "defaultVideoLength";
      value: AspectRatio | (typeof VIDEO_LENGTH_OPTIONS)[number];
      selectedValue: AspectRatio | (typeof VIDEO_LENGTH_OPTIONS)[number];
      genericError: string;
    }) => {
      const { savingKey, setting, value, selectedValue, genericError } = params;
      if (savingPreference || value === selectedValue) return;

      setErrorText(null);
      setSavingPreference(savingKey);
      try {
        if (usesLocalProfile) {
          const localUpdates =
            setting === "defaultAspectRatio"
              ? { defaultAspectRatio: value as AspectRatio }
              : {
                  defaultVideoLength:
                    value as (typeof VIDEO_LENGTH_OPTIONS)[number],
                };
          const saved = await setLocalProfilePreferences(localUpdates);
          setLocalPreferences(saved);
        } else {
          const remotePreferences =
            setting === "defaultAspectRatio"
              ? { defaultAspectRatio: value as AspectRatio }
              : {
                  defaultVideoLength:
                    value as (typeof VIDEO_LENGTH_OPTIONS)[number],
                };
          await ensureUserRecord(convexUser);
          await updateProfile({ preferences: remotePreferences });
        }

        track("profile_preference_updated", {
          setting,
          value: String(value),
          isGuest: String(isGuest),
        });
      } catch (error) {
        const saveError = isMissingConvexTemplateError(error)
          ? "Clerk JWT template 'convex' is missing. Configure it in Clerk, then sign out/in."
          : isUnauthenticatedError(error)
            ? "Session isn't ready yet. Please wait a moment and try again."
            : genericError;
        setErrorText(saveError);
        console.warn("Failed to save profile preference:", {
          setting,
          error,
        });
      } finally {
        setSavingPreference(null);
      }
    },
    [
      convexUser,
      savingPreference,
      usesLocalProfile,
      ensureUserRecord,
      updateProfile,
      track,
      isGuest,
      isMissingConvexTemplateError,
      isUnauthenticatedError,
    ],
  );

  const saveAspectRatio = useCallback(
    async (next: AspectRatio) => {
      await savePreference({
        savingKey: "aspectRatio",
        setting: "defaultAspectRatio",
        value: next,
        selectedValue: selectedAspectRatio,
        genericError: "Couldn't update aspect ratio. Please try again.",
      });
    },
    [savePreference, selectedAspectRatio],
  );

  const saveVideoLength = useCallback(
    async (next: (typeof VIDEO_LENGTH_OPTIONS)[number]) => {
      await savePreference({
        savingKey: "videoLength",
        setting: "defaultVideoLength",
        value: next,
        selectedValue: selectedVideoLength,
        genericError: "Couldn't update default length. Please try again.",
      });
    },
    [savePreference, selectedVideoLength],
  );

  const runSignOut = useCallback(async () => {
    setIsSigningOut(true);
    setErrorText(null);
    try {
      if (isLocalGuest) {
        await clearLocalSession();
        track("sign_out_completed", { method: "local", isGuest: "true" });
        router.replace("/(auth)/sign-in");
        return;
      }
      await removePushTokenForCurrentDevice();
      await clearLocalSession();
      await signOut();
      track("sign_out_completed", { method: "auth", isGuest: String(isGuest) });
    } catch (error) {
      console.warn("Failed to sign out:", error);
      setErrorText("Sign out failed. Please try again.");
      Alert.alert("Error", "Failed to sign out. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  }, [
    isLocalGuest,
    clearLocalSession,
    router,
    removePushTokenForCurrentDevice,
    signOut,
    track,
    isGuest,
  ]);

  const handleSignOut = useCallback(() => {
    track("sign_out_tapped", { isGuest: String(isGuest) });
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          void runSignOut();
        },
      },
    ]);
  }, [track, isGuest, runSignOut]);

  const runDeleteAccount = useCallback(async () => {
    setIsDeleting(true);
    setErrorText(null);
    track("account_delete_started", { isGuest: String(isGuest) });

    try {
      await removePushTokenForCurrentDevice();
      await ensureUserRecord(convexUser);
      await softDeleteCurrent({});
      await clearLocalOnboardingCompleted(userId);
      track("account_deleted", { isGuest: String(isGuest) });
      await clearLocalSession();
      await signOut();
      router.replace("/(auth)/sign-in");
    } catch (error) {
      console.warn("Failed to delete account:", error);
      const deleteError = isUnauthenticatedError(error)
        ? "Session isn't ready yet. Please wait a moment and try again."
        : isMissingConvexTemplateError(error)
          ? "Clerk JWT template 'convex' is missing. Configure it in Clerk, then sign out/in."
          : "Account deletion failed. Please try again.";
      setErrorText(deleteError);
      Alert.alert("Delete failed", "We couldn't delete your account right now.");
    } finally {
      setIsDeleting(false);
    }
  }, [
    track,
    isGuest,
    convexUser,
    removePushTokenForCurrentDevice,
    ensureUserRecord,
    softDeleteCurrent,
    userId,
    clearLocalSession,
    signOut,
    router,
    isUnauthenticatedError,
    isMissingConvexTemplateError,
  ]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      "Delete Account",
      "This will deactivate your account. Your project history stays recoverable for v1 support.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void runDeleteAccount();
          },
        },
      ],
    );
  }, [runDeleteAccount]);

  const actionsDisabled = isSigningOut || isDeleting;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
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
              <Text style={styles.guestBadgeText}>Guest Session</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Defaults</Text>
          <Text style={styles.sectionDescription}>
            New create sessions use these defaults. Existing projects keep their saved values.
          </Text>

          {isLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.accent.primary} />
              <Text style={styles.loadingText}>Loading profile settings...</Text>
            </View>
          ) : (
            <>
              <View style={styles.settingBlock}>
                <View style={styles.settingHeader}>
                  <Text style={styles.settingLabel}>Default Aspect Ratio</Text>
                  {savingPreference === "aspectRatio" && (
                    <ActivityIndicator size="small" color={colors.accent.primary} />
                  )}
                </View>
                <View style={styles.optionRow}>
                  {ASPECT_RATIO_OPTIONS.map((option) => {
                    const selected = option === selectedAspectRatio;
                    return (
                      <Pressable
                        key={option}
                        onPress={() => void saveAspectRatio(option)}
                        disabled={actionsDisabled}
                        style={({ pressed }) => [
                          styles.optionChip,
                          selected && styles.optionChipSelected,
                          pressed && !actionsDisabled && styles.optionChipPressed,
                        ]}
                        accessibilityLabel={`Set default aspect ratio to ${option}`}
                        accessibilityRole="button"
                      >
                        <Text
                          style={[
                            styles.optionChipText,
                            selected && styles.optionChipTextSelected,
                          ]}
                        >
                          {option}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.settingBlock}>
                <View style={styles.settingHeader}>
                  <Text style={styles.settingLabel}>Default Video Length</Text>
                  {savingPreference === "videoLength" && (
                    <ActivityIndicator size="small" color={colors.accent.primary} />
                  )}
                </View>
                <View style={styles.optionRow}>
                  {VIDEO_LENGTH_OPTIONS.map((option) => {
                    const selected = option === selectedVideoLength;
                    return (
                      <Pressable
                        key={option}
                        onPress={() => void saveVideoLength(option)}
                        disabled={actionsDisabled}
                        style={({ pressed }) => [
                          styles.optionChip,
                          selected && styles.optionChipSelected,
                          pressed && !actionsDisabled && styles.optionChipPressed,
                        ]}
                        accessibilityLabel={`Set default video length to ${option} seconds`}
                        accessibilityRole="button"
                      >
                        <Text
                          style={[
                            styles.optionChipText,
                            selected && styles.optionChipTextSelected,
                          ]}
                        >
                          {option}s
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </>
          )}
        </View>

        {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Pressable
            style={({ pressed }) => [
              styles.actionRow,
              pressed && !actionsDisabled && styles.actionRowPressed,
            ]}
            onPress={handleSignOut}
            disabled={actionsDisabled}
            accessibilityLabel="Sign out"
            accessibilityRole="button"
          >
            <View style={styles.actionRowLeft}>
              <Ionicons name="log-out-outline" size={20} color={colors.dark.text} />
              <Text style={styles.actionText}>
                {isLocalGuest ? "Exit Guest Mode" : "Sign Out"}
              </Text>
            </View>
            {isSigningOut ? (
              <ActivityIndicator size="small" color={colors.dark.textSecondary} />
            ) : (
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.dark.textSecondary}
              />
            )}
          </Pressable>

          {!isLocalGuest ? (
            <>
              <Pressable
                style={({ pressed }) => [
                  styles.actionRow,
                  pressed && !actionsDisabled && styles.deleteRowPressed,
                ]}
                onPress={handleDeleteAccount}
                disabled={actionsDisabled}
                accessibilityLabel="Delete account"
                accessibilityRole="button"
              >
                <View style={styles.actionRowLeft}>
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={colors.accent.error}
                  />
                  <Text style={styles.deleteText}>Delete Account</Text>
                </View>
                {isDeleting ? (
                  <ActivityIndicator size="small" color={colors.accent.error} />
                ) : (
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.dark.textSecondary}
                  />
                )}
              </Pressable>

              <Text style={styles.warningText}>
                Deleting deactivates your account for v1 while keeping records recoverable.
              </Text>
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  content: {
    paddingBottom: spacing.xxl,
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
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.dark.surface,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#262628",
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: radius.full,
    backgroundColor: "#121214",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  name: {
    ...typography.h2,
    color: colors.dark.text,
  },
  email: {
    ...typography.body,
    color: colors.dark.textSecondary,
    marginTop: spacing.xs,
  },
  guestBadge: {
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: "#2A1C11",
    borderWidth: 1,
    borderColor: "#543217",
  },
  guestBadgeText: {
    ...typography.caption,
    color: "#FFB876",
    fontWeight: "600",
  },
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.dark.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  sectionDescription: {
    ...typography.caption,
    color: "#7F7F86",
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.dark.textSecondary,
  },
  settingBlock: {
    backgroundColor: colors.dark.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  settingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  settingLabel: {
    ...typography.body,
    color: colors.dark.text,
    fontWeight: "600",
  },
  optionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  optionChip: {
    flex: 1,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "#38383C",
    paddingVertical: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#101012",
  },
  optionChipSelected: {
    backgroundColor: colors.dark.text,
    borderColor: colors.dark.text,
  },
  optionChipPressed: {
    opacity: 0.85,
  },
  optionChipText: {
    ...typography.body,
    color: colors.dark.textSecondary,
    fontWeight: "600",
  },
  optionChipTextSelected: {
    color: "#000000",
  },
  errorText: {
    ...typography.caption,
    color: colors.accent.error,
    marginTop: spacing.sm,
    marginHorizontal: spacing.lg,
  },
  actionRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dark.surface,
    borderWidth: 1,
    borderColor: colors.dark.border,
    marginBottom: spacing.sm,
  },
  actionRowPressed: {
    opacity: 0.86,
  },
  deleteRowPressed: {
    backgroundColor: "#221012",
  },
  actionRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  actionText: {
    ...typography.body,
    color: colors.dark.text,
    fontWeight: "600",
  },
  deleteText: {
    ...typography.body,
    color: colors.accent.error,
    fontWeight: "600",
  },
  warningText: {
    ...typography.caption,
    color: "#7F7F86",
    lineHeight: 18,
    marginTop: spacing.xs,
  },
});
