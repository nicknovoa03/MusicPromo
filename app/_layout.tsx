import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { ClerkProvider, ClerkLoaded, useAuth } from "@clerk/clerk-expo";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { PostHogProvider } from "posthog-react-native";
import { StatusBar } from "expo-status-bar";
import { tokenCache } from "@/lib/clerk";
import { convex } from "@/lib/convex";

const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
if (!clerkPublishableKey) {
  throw new Error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY");
}
const posthogApiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const posthogHost = process.env.EXPO_PUBLIC_POSTHOG_HOST;

function AuthGate() {
  const { isSignedIn, isLoaded } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isSignedIn && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (isSignedIn && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isSignedIn, isLoaded, segments]);

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
    <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <AppWithProviders />
      </ClerkLoaded>
    </ClerkProvider>
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
