import { useCallback, useEffect, useMemo } from "react";
import { Image, StyleSheet } from "react-native";
import { Redirect, Stack, useSegments } from "expo-router";
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

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="onboarding/index" options={{ gestureEnabled: false }} />
      <Stack.Screen
        name="create"
        options={{ gestureEnabled: false }}
      />
    </Stack>
  );
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

  return <StatusBar style={isDarkMode || isDarkSurface ? "light" : "dark"} />;
}

function useConvexAuthFromClerk() {
  const { isLoaded, isSignedIn, getToken, orgId, orgRole } = useAuth();

  const fetchAccessToken = useCallback(
    async (args: { forceRefreshToken: boolean }) => {
      try {
        // Convex sets forceRefreshToken when it needs a fresh JWT after
        // rejecting a cached token.
        return await getToken({
          template: "convex",
          skipCache: Boolean(args.forceRefreshToken),
        });
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
      {/* Pre-render watermark logo off-screen so it's decoded before first use */}
      <Image
        source={require("../assets/branding/MusicPromo-Logo.png")}
        style={styles.preloadHidden}
        fadeDuration={0}
      />
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

const styles = StyleSheet.create({
  preloadHidden: {
    position: "absolute",
    top: -200,
    left: -200,
    width: 48,
    height: 48,
  },
});
