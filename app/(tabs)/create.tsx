import { useCallback } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { usePostHog } from "posthog-react-native";
import { colors } from "@/constants/tokens";
import type { EventName } from "@/lib/analytics";

export default function CreateScreen() {
  const router = useRouter();
  const posthog = usePostHog();

  useFocusEffect(
    useCallback(() => {
      posthog?.capture("create_started" satisfies EventName);
      router.replace("/create/picker" as const);
    }, [posthog, router]),
  );

  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.accent.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
    alignItems: "center",
    justifyContent: "center",
  },
});
