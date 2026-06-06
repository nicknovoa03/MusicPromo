import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useLocalSearchParams } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { onboardingCopy } from "@/constants/onboardingCopy";
import { onboardingTheme } from "@/constants/onboardingTheme";
import { spacing } from "@/constants/tokens";
import { CURRENT_ONBOARDING_VERSION, getLocalOnboardingVersion } from "@/lib/onboarding";
import { useLocalSession } from "@/providers/localSession";

export default function OnboardingScreen() {
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const isDevPreview = __DEV__ && preview === "1";

  const { userId } = useAuth();
  const { isAuthenticated } = useConvexAuth();
  const { isLocalGuest } = useLocalSession();
  const currentUser = useQuery(api.users.current);

  const [localVersion, setLocalVersion] = useState(0);
  const [localReady, setLocalReady] = useState(false);

  useEffect(() => {
    let active = true;
    setLocalReady(false);
    (async () => {
      try {
        const version = await getLocalOnboardingVersion(userId, {
          localGuest: isLocalGuest,
        });
        if (active) setLocalVersion(version);
      } catch (error) {
        console.warn("Failed to read onboarding state:", error);
      } finally {
        if (active) setLocalReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [userId, isLocalGuest]);

  const localCompleted = localVersion >= CURRENT_ONBOARDING_VERSION;
  const serverCompleted =
    isAuthenticated && Boolean(currentUser?.onboardingCompletedAt);
  const hasCompletionState =
    localReady &&
    (isLocalGuest ? true : localCompleted || currentUser !== undefined);

  if (isDevPreview) {
    return <OnboardingWizard previewMode />;
  }

  if (hasCompletionState && (localCompleted || serverCompleted)) {
    return <Redirect href="/" />;
  }

  if (!hasCompletionState) {
    return (
      <SafeAreaView style={styles.loading} edges={["top", "bottom"]}>
        <ActivityIndicator size="large" color={onboardingTheme.text} />
        <Text style={styles.loadingText}>{onboardingCopy.loading}</Text>
      </SafeAreaView>
    );
  }

  return <OnboardingWizard />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: onboardingTheme.bg,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 15,
    color: onboardingTheme.textSecondary,
  },
});
