import { Stack } from "expo-router";
import { Platform } from "react-native";
import { colors } from "@/constants/tokens";
import { LaunchScopeRedirect } from "@/components/LaunchScopeRedirect";
import { SpkDraftProvider } from "@/providers/SpkDraftContext";

/** Forward: new screen enters from the right. Back uses `animationTypeForReplace: "pop"`. */
const forwardAnimation = Platform.OS === "ios" ? "default" : "slide_from_right";

const backReplaceOptions = {
  animationTypeForReplace: "pop" as const,
};

export default function SpkLayout() {
  return (
    <>
    <LaunchScopeRedirect />
    <SpkDraftProvider>
    <Stack
      screenOptions={{
        headerShown: false,
        animation: forwardAnimation,
        contentStyle: { backgroundColor: colors.dark.background },
      }}
    >
      <Stack.Screen name="details" />
      <Stack.Screen name="vision" options={backReplaceOptions} />
      <Stack.Screen name="metadata" options={backReplaceOptions} />
      <Stack.Screen
        name="preview"
        options={{
          ...backReplaceOptions,
          gestureEnabled: false,
          animation: forwardAnimation,
        }}
      />
    </Stack>
    </SpkDraftProvider>
    </>
  );
}
