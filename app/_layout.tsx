import { useCallback, useEffect, useMemo } from "react";
import { Redirect, Slot, useSegments } from "expo-router";
import { ClerkProvider, ClerkLoaded, useAuth } from "@clerk/clerk-expo";
import { ConvexProviderWithAuth } from "convex/react";
import { PostHogProvider } from "posthog-react-native";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import { tokenCache } from "@/lib/clerk";
import { convex } from "@/lib/convex";
import {
  getIOSNativeUIPhase5Availability,
  IOS_NATIVE_UI_PHASE5_FLAG_NAME,
} from "@/lib/iosNativeUi";
import {
  LocalSessionProvider,
  useLocalSession,
} from "@/providers/localSession";

const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
if (!clerkPublishableKey) {
  throw new Error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY");
}
const posthogApiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const posthogHost = process.env.EXPO_PUBLIC_POSTHOG_HOST;

function AuthGate() {
  const { isSignedIn, isLoaded } = useAuth();
  const { isHydrated, isLocalGuest, clearLocalSession } = useLocalSession();
  const segments = useSegments();

  useEffect(() => {
    if (isSignedIn && isLocalGuest) {
      void clearLocalSession();
    }
  }, [isSignedIn, isLocalGuest, clearLocalSession]);

  if (!isLoaded || !isHydrated) {
    return null;
  }

  const hasSession = Boolean(isSignedIn) || isLocalGuest;
  const inAuthGroup = segments[0] === "(auth)";

  if (!hasSession && !inAuthGroup) {
    return <Redirect href="/(auth)/sign-in" />;
  }
  if (hasSession && inAuthGroup) {
    return <Redirect href="/" />;
  }

  return <Slot />;
}

function AppStatusBar() {
  const segments = useSegments();
  const colorScheme = useColorScheme();
  const root = segments[0];
  const child = segments[1];
  const isDarkMode = colorScheme === "dark";

  const isDarkSurface =
    root === "create" &&
    (child === "editor" || child === "rendering" || child === "share");
  const isProfileSurface = root === "(tabs)" && child === "profile";

  return <StatusBar style={isDarkMode || isDarkSurface || isProfileSurface ? "light" : "dark"} />;
}

function IOSNativeUIPhase5Bootstrap() {
  useEffect(() => {
    const availability = getIOSNativeUIPhase5Availability({ minIOSVersion: 14 });

    if (!availability.isIOS) {
      return;
    }

    if (
      availability.flagValue !== undefined &&
      availability.flagValue !== "0" &&
      availability.flagValue !== "1"
    ) {
      console.warn(
        `${IOS_NATIVE_UI_PHASE5_FLAG_NAME} must be set to "1" to enable the Phase 5 iOS-native UI path.`,
      );
      return;
    }

    if (availability.flagEnabled && !availability.runtimeAvailable) {
      console.info(
        "Phase 5 iOS-native UI flag is enabled, but Expo UI is unavailable in this runtime. Falling back to React Native surfaces.",
      );
    }
  }, []);

  return null;
}

function useConvexAuthFromClerk() {
  const { isLoaded, isSignedIn, getToken, orgId, orgRole } = useAuth();

  const fetchAccessToken = useCallback(
    async (_args: { forceRefreshToken: boolean }) => {
      try {
        // Intentionally avoid `skipCache` due Clerk API rejecting the
        // debug query param currently used for forced refresh requests.
        return await getToken({ template: "convex" });
      } catch {
        return null;
      }
    },
    // Clerk's `getToken` is not memoized; keeping it out of deps avoids
    // rebuilding the fetcher each render and thrashing Convex auth state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orgId, orgRole]
  );

  return useMemo(
    () => ({
      isLoading: !isLoaded,
      isAuthenticated: isSignedIn ?? false,
      fetchAccessToken,
    }),
    [isLoaded, isSignedIn, fetchAccessToken]
  );
}

function AppWithProviders() {
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useConvexAuthFromClerk}>
      <AuthGate />
      <AppStatusBar />
      <IOSNativeUIPhase5Bootstrap />
    </ConvexProviderWithAuth>
  );
}

export default function RootLayout() {
  const posthogEnabled = posthogApiKey && posthogHost;

  const inner = (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <LocalSessionProvider>
        <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}>
          <ClerkLoaded>
            <AppWithProviders />
          </ClerkLoaded>
        </ClerkProvider>
      </LocalSessionProvider>
    </SafeAreaProvider>
  );

  if (posthogEnabled) {
    return (
      <PostHogProvider
        apiKey={posthogApiKey}
        options={{ host: posthogHost }}
      >
        {inner}
      </PostHogProvider>
    );
  }

  return inner;
}
