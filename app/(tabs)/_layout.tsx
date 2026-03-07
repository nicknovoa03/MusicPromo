import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Redirect, Tabs, usePathname, useRouter } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { useAuth, useUser } from "@clerk/clerk-expo";
import type { NotificationResponse } from "expo-notifications";
import { api } from "../../convex/_generated/api";
import { colors, typography } from "@/constants/tokens";
import type { EventName } from "@/lib/analytics";
import { getLocalOnboardingCompleted } from "@/lib/onboarding";
import { useLocalSession } from "@/providers/localSession";
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

function LiquidGlassTabBarBackground() {
  return (
    <View style={styles.glassRoot} pointerEvents="none">
      <View style={styles.glassTint} />
      <View style={styles.glassTopSheen} />
      <View style={styles.glassInnerStroke} />
    </View>
  );
}

export default function TabsLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useConvexAuth();
  const getOrCreateUser = useMutation(api.users.getOrCreate);
  const upsertPushToken = useMutation(api.pushTokens.upsertForCurrentUser);
  const currentUser = useQuery(api.users.current);
  const posthog = usePostHog();
  const { signOut, getToken, userId, isSignedIn } = useAuth();
  const { isLocalGuest } = useLocalSession();
  const { user } = useUser();
  const didBootstrapPush = useRef(false);
  const hasWarnedMissingConvexToken = useRef(false);
  const previousPathnameRef = useRef<string | null>(null);
  const [localOnboardingReady, setLocalOnboardingReady] = useState(false);
  const [localOnboardingCompleted, setLocalOnboardingCompleted] = useState(false);

  const track = useCallback(
    (event: EventName, props?: Record<string, string>) => {
      posthog?.capture(event, props);
    },
    [posthog]
  );

  const hasSession = Boolean(isSignedIn) || isLocalGuest;

  useEffect(() => {
    if (hasSession) return;
    didBootstrapPush.current = false;
    hasWarnedMissingConvexToken.current = false;
  }, [hasSession]);

  useEffect(() => {
    let isActive = true;
    setLocalOnboardingReady(false);

    (async () => {
      const completed = await getLocalOnboardingCompleted(userId, {
        localGuest: isLocalGuest,
      });
      if (!isActive) return;
      setLocalOnboardingCompleted(completed);
      setLocalOnboardingReady(true);
    })();

    return () => {
      isActive = false;
    };
  }, [userId, isLocalGuest]);

  const hasServerOnboardingCompletion =
    isAuthenticated && Boolean(currentUser?.onboardingCompletedAt);
  const isOnboardingCompleted =
    localOnboardingCompleted || hasServerOnboardingCompletion;
  const hasOnboardingStatus = localOnboardingReady && (
    isLocalGuest
      ? true
      : isOnboardingCompleted || currentUser !== undefined
  );

  useEffect(() => {
    if (
      !isAuthenticated ||
      currentUser === undefined ||
      !isSignedIn ||
      !userId ||
      didBootstrapPush.current
    ) {
      return;
    }
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
        if (message.includes("Unauthenticated")) {
          shouldContinue = false;
          // Allow a later retry once Convex auth catches up with the Clerk session.
          didBootstrapPush.current = false;
          console.warn("Convex auth not ready yet. Will retry bootstrap shortly.");
          return;
        }
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
    currentUser,
    isSignedIn,
    userId,
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
      router.replace("/");
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

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    const previousPathname = previousPathnameRef.current;
    const enteredCreate = pathname === "/create" && previousPathname !== "/create";

    if (enteredCreate) {
      track("create_started");
    }

    previousPathnameRef.current = pathname;
  }, [pathname, track]);

  if (!hasSession) {
    return null;
  }
  if (!hasOnboardingStatus) {
    return (
      <View style={styles.gateContainer}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
        <Text style={styles.gateText}>
          {isLocalGuest ? "Preparing guest workspace..." : "Loading your workspace..."}
        </Text>
      </View>
    );
  }
  if (!isOnboardingCompleted) {
    return <Redirect href="/onboarding" />;
  }
  if (Platform.OS === "ios") {
    return (
      <NativeTabs
        blurEffect="systemThinMaterialLight"
        backgroundColor="rgba(245,250,255,0.62)"
        shadowColor="transparent"
        iconColor={{
          default: colors.light.textSecondary,
          selected: colors.light.text,
        }}
        labelStyle={{
          default: {
            fontSize: typography.caption.fontSize,
            fontWeight: "500",
            color: colors.light.textSecondary,
          },
          selected: {
            fontSize: typography.caption.fontSize,
            fontWeight: "600",
            color: colors.light.text,
          },
        }}
      >
        <NativeTabs.Trigger name="index">
          <Icon sf={{ default: "house", selected: "house.fill" }} />
          <Label>Home</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="create">
          <Icon sf={{ default: "plus.circle", selected: "plus.circle.fill" }} />
          <Label>Create</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile">
          <Icon sf={{ default: "person", selected: "person.fill" }} />
          <Label>Profile</Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.light.text,
        tabBarInactiveTintColor: colors.light.textSecondary,
        tabBarBackground: () => <LiquidGlassTabBarBackground />,
        tabBarStyle: {
          position: "absolute",
          left: 14,
          right: 14,
          bottom: 0,
          height: 84,
          borderTopWidth: 0,
          backgroundColor: "transparent",
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          overflow: "hidden",
          paddingBottom: 8,
          paddingTop: 8,
          ...Platform.select({
            ios: {
              shadowColor: "#102440",
              shadowOpacity: 0.16,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 2 },
            },
            android: {
              elevation: 10,
            },
          }),
        },
        tabBarItemStyle: {
          borderRadius: 20,
        },
        tabBarLabelStyle: {
          fontSize: typography.caption.fontSize,
          fontWeight: "600",
          marginTop: -1,
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
        listeners={{
          tabPress: () => {
            track("create_started");
          },
        }}
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

const styles = StyleSheet.create({
  glassRoot: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: "hidden",
  },
  glassTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(245,250,255,0.78)",
  },
  glassTopSheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth + 1.5,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  glassInnerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.78)",
  },
  gateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.light.background,
    gap: 12,
  },
  gateText: {
    ...typography.body,
    color: colors.light.textSecondary,
  },
});
