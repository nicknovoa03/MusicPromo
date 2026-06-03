import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import { colors, typography } from "@/constants/tokens";

type AppLoadingGateProps = {
  label?: string;
};

export function AppLoadingGate({ label = "Loading…" }: AppLoadingGateProps) {
  const isWeb = Platform.OS === "web";

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isWeb ? colors.light.background : colors.dark.background },
      ]}
    >
      <ActivityIndicator
        size="large"
        color={isWeb ? colors.light.text : colors.dark.text}
      />
      <Text
        style={[
          styles.label,
          { color: isWeb ? colors.light.textSecondary : colors.dark.textSecondary },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  label: {
    ...typography.caption,
  },
});
