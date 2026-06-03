import { Stack } from "expo-router";
import { Platform } from "react-native";
import { colors } from "@/constants/tokens";
import { LaunchScopeRedirect } from "@/components/LaunchScopeRedirect";
import { FlyerWebPreviewFrame } from "@/components/flyer/FlyerWebPreviewFrame";
import { FlyerDraftProvider } from "@/providers/FlyerDraftContext";
import { FlyerFontsProvider } from "@/providers/FlyerFontsProvider";
import { useFlyerProjectHydration } from "@/hooks/useFlyerProjectHydration";

/** Forward: new screen enters from the right. Back uses `animationTypeForReplace: "pop"`. */
const forwardAnimation = Platform.OS === "ios" ? "default" : "slide_from_right";

const backReplaceOptions = {
  animationTypeForReplace: "pop" as const,
};

function FlyerProjectHydrator() {
  useFlyerProjectHydration();
  return null;
}

export default function FlyerLayout() {
  return (
    <>
    <LaunchScopeRedirect />
    <FlyerDraftProvider>
      <FlyerProjectHydrator />
      <FlyerFontsProvider>
      <FlyerWebPreviewFrame>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: forwardAnimation,
          contentStyle: { backgroundColor: colors.dark.background },
        }}
      >
        <Stack.Screen
          name="details"
          options={{
            ...backReplaceOptions,
            contentStyle: {
              backgroundColor: colors.light.background,
            },
          }}
        />
        <Stack.Screen name="editor" options={backReplaceOptions} />
        <Stack.Screen
          name="export"
          options={{
            ...backReplaceOptions,
            animation: "fade",
          }}
        />
      </Stack>
      </FlyerWebPreviewFrame>
      </FlyerFontsProvider>
    </FlyerDraftProvider>
    </>
  );
}
