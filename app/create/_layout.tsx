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
    </Stack>
  );
}
