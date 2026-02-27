import { useCallback, useEffect, useRef } from "react";
import { StyleSheet } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useConvexAuth, useMutation } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { useAuth, useUser } from "@clerk/clerk-expo";
import type { NotificationResponse } from "expo-notifications";
import { api } from "../../convex/_generated/api";
import { colors, typography } from "@/constants/tokens";
import type { EventName } from "@/lib/analytics";
import {
  handleInitialNotificationTap,
  registerNotificationListeners,
  registerPushTokenForCurrentUser,
} from "@/lib/notifications";

function extractNotificationType(data: unknown) {
  if (!data || typeof data !== "object") return "unknown";
  const type = (data as { type?: unknown }).type;
  return typeof type === "string" ? type : "unknown";
}

export default function TabsLayout() {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const getOrCreateUser = useMutation(api.users.getOrCreate);
  const upsertPushToken = useMutation(api.pushTokens.upsertForCurrentUser);
  const posthog = usePostHog();
  const { signOut, getToken } = useAuth();
  const { user } = useUser();
  const didBootstrapPush = useRef(false);
  const hasWarnedMissingConvexToken = useRef(false);

  const track = useCallback(
    (event: EventName, props?: Record<string, string>) => {
      posthog?.capture(event, props);
    },
    [posthog]
  );

  useEffect(() => {
    if (isAuthenticated) return;
    didBootstrapPush.current = false;
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || didBootstrapPush.current) return;
    didBootstrapPush.current = true;

    (async () => {
      let shouldContinue = true;
      let convexToken: string | null = null;
      try {
        convexToken = await getToken({ template: "convex" });
      } catch (error) {
        if (!hasWarnedMissingConvexToken.current) {
          hasWarnedMissingConvexToken.current = true;
          console.warn(
            "Missing Clerk JWT template 'convex'. Create it in Clerk Dashboard, then sign out/in.",
            error,
          );
        }
        return;
      }
      if (!convexToken) {
        if (!hasWarnedMissingConvexToken.current) {
          hasWarnedMissingConvexToken.current = true;
          console.warn(
            "Clerk JWT template 'convex' token is unavailable. Convex mutations are disabled until this template is configured and session refreshed.",
          );
        }
        return;
      }
      try {
        await getOrCreateUser();
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.includes("Account deleted")) {
          shouldContinue = false;
          try {
            await signOut();
          } catch (signOutError) {
            console.warn("Failed to sign out deleted account:", signOutError);
          }
          router.replace("/(auth)/sign-in");
          return;
        }
        console.warn("Failed to bootstrap user:", error);
      }

      if (!shouldContinue) return;
      await registerPushTokenForCurrentUser(upsertPushToken);
    })();
  }, [
    isAuthenticated,
    getOrCreateUser,
    upsertPushToken,
    router,
    signOut,
    getToken,
  ]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const handleTapped = (response: NotificationResponse) => {
      track("notification_tapped", {
        notificationType: extractNotificationType(
          response.notification.request.content.data
        ),
      });
      router.replace("/(tabs)");
    };

    handleInitialNotificationTap(handleTapped).catch((error) => {
      console.warn("Failed to process initial notification tap:", error);
    });

    return registerNotificationListeners({
      onReceived: (notification) => {
        track("notification_received", {
          notificationType: extractNotificationType(
            notification.request.content.data
          ),
        });
      },
      onTapped: handleTapped,
    });
  }, [isAuthenticated, router, track]);

  useEffect(() => {
    posthog?.capture("app_opened");
  }, []);

  useEffect(() => {
    if (user) {
      posthog?.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress ?? "",
        name: user.fullName ?? "",
      });
    }
  }, [user]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.light.text,
        tabBarInactiveTintColor: colors.light.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.light.background,
          borderTopColor: colors.light.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 88,
          paddingBottom: 30,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: typography.caption.fontSize,
          fontWeight: "500",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "Create",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
