import { Stack } from "expo-router";
import { Platform } from "react-native";
import { colors } from "@/constants/tokens";
import { FlyerWebPreviewFrame } from "@/components/flyer/FlyerWebPreviewFrame";
import { FlyerDraftProvider } from "@/providers/FlyerDraftContext";
import { FlyerFontsProvider } from "@/providers/FlyerFontsProvider";

const forwardAnimation = Platform.OS === "ios" ? "default" : "slide_from_right";

const backReplaceOptions = {
  animationTypeForReplace: "pop" as const,
};

export default function FlyerLayout() {
  return (
    <FlyerDraftProvider>
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
  );
}
