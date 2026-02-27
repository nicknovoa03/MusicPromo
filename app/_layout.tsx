import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
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
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded || !isHydrated) return;

    if (isSignedIn && isLocalGuest) {
      void clearLocalSession();
    }

    const hasSession = isSignedIn || isLocalGuest;
    const inAuthGroup = segments[0] === "(auth)";

    if (!hasSession && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (hasSession && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isSignedIn, isLoaded, isHydrated, isLocalGuest, clearLocalSession, segments, router]);

  return <Slot />;
}

function AppWithProviders() {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <AuthGate />
      <StatusBar style="auto" />
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
