import { useEffect } from "react";
import { Redirect, Slot, useSegments } from "expo-router";
import { ClerkProvider, ClerkLoaded, useAuth } from "@clerk/clerk-expo";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { PostHogProvider } from "posthog-react-native";
import { StatusBar } from "expo-status-bar";
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

  return <Slot />;
}

function AppStatusBar() {
  const segments = useSegments();
  const root = segments[0];
  const child = segments[1];

  const isDarkSurface =
    root === "create" &&
    (child === "editor" || child === "rendering" || child === "share");
  const isProfileSurface = root === "(tabs)" && child === "profile";

  return <StatusBar style={isDarkSurface || isProfileSurface ? "light" : "dark"} />;
}

function AppWithProviders() {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <AuthGate />
      <AppStatusBar />
    </ConvexProviderWithClerk>
  );
}

export default function RootLayout() {
  const posthogEnabled = posthogApiKey && posthogHost;

  const inner = (
    <LocalSessionProvider>
      <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}>
        <ClerkLoaded>
          <AppWithProviders />
        </ClerkLoaded>
      </ClerkProvider>
    </LocalSessionProvider>
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
