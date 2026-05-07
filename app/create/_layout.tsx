import { Stack } from "expo-router";
import { Platform, useColorScheme } from "react-native";
import { colors } from "@/constants/tokens";

export default function CreateLayout() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const defaultCreateAnimation = Platform.OS === "ios" ? "default" : "slide_from_right";

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: defaultCreateAnimation,
      }}
    >
      <Stack.Screen
        name="type-picker"
        options={{
          contentStyle: {
            backgroundColor: isDarkMode ? colors.dark.background : colors.light.background,
          },
        }}
      />
      <Stack.Screen
        name="picker"
        options={{
          contentStyle: {
            backgroundColor: isDarkMode ? colors.dark.background : colors.light.background,
          },
        }}
      />
      <Stack.Screen
        name="epk"
        options={{
          contentStyle: { backgroundColor: colors.dark.background },
          gestureEnabled: false,
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="editor"
        options={{
          contentStyle: { backgroundColor: colors.dark.background },
          animation: "fade",
          // Prevent iOS back-swipe from hijacking horizontal trim gestures.
          // Editor already has an explicit close affordance in its header.
          gestureEnabled: false,
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
