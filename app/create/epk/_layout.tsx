import { Stack } from "expo-router";
import { Platform } from "react-native";
import { colors } from "@/constants/tokens";

export default function EpkLayout() {
  const animation = Platform.OS === "ios" ? "default" : "slide_from_right";

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation,
        contentStyle: { backgroundColor: colors.dark.background },
      }}
    >
      <Stack.Screen name="details" />
      <Stack.Screen name="vision" />
      <Stack.Screen
        name="preview"
        options={{ gestureEnabled: false, animation: "fade" }}
      />
    </Stack>
  );
}
