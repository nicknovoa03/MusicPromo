import { useCallback, useEffect, useMemo, type ReactNode } from "react";
import { Image, Platform, StyleSheet } from "react-native";
import { Redirect, Stack, usePathname, useSegments } from "expo-router";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { ConvexProviderWithAuth } from "convex/react";
import { PostHogProvider } from "posthog-react-native";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppLoadingGate } from "@/components/AppLoadingGate";
import { tokenCache } from "@/lib/clerk";
import { convex } from "@/lib/convex";
import {
  LocalSessionProvider,
  useLocalSession,
} from "@/providers/localSession";
import { WebFlyerDevRoot } from "@/providers/WebFlyerDevRoot";

const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
if (!clerkPublishableKey) {
  throw new Error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY");
}
const posthogApiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const posthogHost = process.env.EXPO_PUBLIC_POSTHOG_HOST;

function getInitialWebPathname(): string | null {
  if (Platform.OS !== "web" || typeof globalThis.location?.pathname !== "string") {
    return null;
  }
  return globalThis.location.pathname;
}

function isFlyerWebPath(pathname: string | null): boolean {
  const path = pathname ?? getInitialWebPathname();
  return Boolean(
    path && (path === "/create/flyer" || path.startsWith("/create/flyer/")),
  );
}

/** Opt-in dev preview on web only (`?flyerPreview=1`). Normal flyer flow uses Clerk. */
function isFlyerWebPreviewMode(pathname: string | null): boolean {
  if (!__DEV__ || Platform.OS !== "web" || !isFlyerWebPath(pathname)) {
    return false;
  }
  const search =
    typeof globalThis.location?.search === "string"
      ? globalThis.location.search
      : "";
  return search.includes("flyerPreview=1");
}

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
    return <AppLoadingGate label="Starting MusicPromo…" />;
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
      <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
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

function withPostHog(children: ReactNode) {
  if (!posthogApiKey || !posthogHost) {
    return children;
  }

  return (
    <PostHogProvider apiKey={posthogApiKey} options={{ host: posthogHost }}>
      {children}
    </PostHogProvider>
  );
}

export default function RootLayout() {
  const pathname = usePathname();

  if (isFlyerWebPreviewMode(pathname)) {
    return withPostHog(<WebFlyerDevRoot />);
  }

  const inner = (
    <SafeAreaProvider>
      <LocalSessionProvider>
        <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}>
          <AppWithProviders />
        </ClerkProvider>
      </LocalSessionProvider>
    </SafeAreaProvider>
  );

  return withPostHog(inner);
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
