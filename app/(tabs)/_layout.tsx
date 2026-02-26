import { useEffect } from "react";
import { StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useConvexAuth, useMutation } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { useUser } from "@clerk/clerk-expo";
import { api } from "../../convex/_generated/api";
import { colors, typography } from "@/constants/tokens";

export default function TabsLayout() {
  const { isAuthenticated } = useConvexAuth();
  const getOrCreateUser = useMutation(api.users.getOrCreate);
  const posthog = usePostHog();
  const { user } = useUser();

  useEffect(() => {
    if (isAuthenticated) {
      getOrCreateUser().catch(() => {});
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (user) {
      posthog?.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress ?? "",
        name: user.fullName ?? "",
      });
    }
    posthog?.capture("app_opened");
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
