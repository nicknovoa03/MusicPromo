import { useEffect, useRef } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { colors } from "@/constants/tokens";
import type { EventName } from "@/lib/analytics";

export default function CreateScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  const didNavigate = useRef(false);

  useEffect(() => {
    if (didNavigate.current) return;
    didNavigate.current = true;
    posthog?.capture("create_started" satisfies EventName);
    router.push("/create/picker" as const);
  }, []);

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
