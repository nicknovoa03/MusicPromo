import { Stack } from "expo-router";
import { Platform } from "react-native";
import { colors } from "@/constants/tokens";

export default function CreateLayout() {
  const defaultCreateAnimation = Platform.OS === "ios" ? "default" : "slide_from_right";

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: defaultCreateAnimation,
      }}
    >
      <Stack.Screen
        name="picker"
        options={{
          contentStyle: { backgroundColor: colors.light.background },
        }}
      />
      <Stack.Screen
        name="editor"
        options={{
          contentStyle: { backgroundColor: colors.dark.background },
          fullScreenGestureEnabled: Platform.OS === "ios",
          animationMatchesGesture: Platform.OS === "ios",
        }}
      />
      <Stack.Screen
        name="rendering"
        options={{
          contentStyle: { backgroundColor: colors.dark.background },
          gestureEnabled: false,
          animation: "fade",
        }}
      />
      <Stack.Screen
        name="share"
        options={{
          contentStyle: { backgroundColor: colors.dark.background },
          gestureEnabled: false,
          animation: "fade",
        }}
      />
    </Stack>
  );
}
