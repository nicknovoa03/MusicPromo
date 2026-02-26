import { Stack } from "expo-router";
import { colors } from "@/constants/tokens";

export default function CreateLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="picker" />
      <Stack.Screen
        name="editor"
        options={{
          contentStyle: { backgroundColor: colors.dark.background },
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
