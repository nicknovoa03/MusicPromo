import { useEffect, useMemo, type ReactNode } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ConvexProviderWithAuth } from "convex/react";
import { AppLoadingGate } from "@/components/AppLoadingGate";
import { FlyerWebPreviewFrame } from "@/components/flyer/FlyerWebPreviewFrame";
import { convex } from "@/lib/convex";
import { FlyerDraftProvider } from "@/providers/FlyerDraftContext";
import { FlyerFontsProvider } from "@/providers/FlyerFontsProvider";
import {
  LocalSessionProvider,
  useLocalSession,
} from "@/providers/localSession";

function useWebFlyerGuestAuth() {
  return useMemo(
    () => ({
      isLoading: false,
      isAuthenticated: false,
      fetchAccessToken: async () => null,
    }),
    [],
  );
}

/**
 * Minimal provider tree for Event Flyer UI review on web (dev only).
 * Skips Clerk so localhost is not blocked by auth/bootstrap loading.
 */
function WebFlyerDevSession({ children }: { children: ReactNode }) {
  const { isHydrated, isLocalGuest, startLocalGuest } = useLocalSession();

  useEffect(() => {
    if (isHydrated && !isLocalGuest) {
      void startLocalGuest();
    }
  }, [isHydrated, isLocalGuest, startLocalGuest]);

  if (!isHydrated) {
    return <AppLoadingGate label="Loading Event Flyer preview…" />;
  }

  return <>{children}</>;
}

export function WebFlyerDevRoot({ children }: { children?: ReactNode }) {
  return (
    <SafeAreaProvider>
      <ConvexProviderWithAuth client={convex} useAuth={useWebFlyerGuestAuth}>
        <LocalSessionProvider>
          <WebFlyerDevSession>
          <FlyerDraftProvider>
            <FlyerFontsProvider>
              <FlyerWebPreviewFrame>
                {children ?? (
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen
                      name="create"
                      options={{ gestureEnabled: false }}
                    />
                  </Stack>
                )}
                <StatusBar style="auto" />
              </FlyerWebPreviewFrame>
            </FlyerFontsProvider>
          </FlyerDraftProvider>
          </WebFlyerDevSession>
        </LocalSessionProvider>
      </ConvexProviderWithAuth>
    </SafeAreaProvider>
  );
}
