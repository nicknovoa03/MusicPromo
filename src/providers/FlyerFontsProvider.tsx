import { useFonts } from "expo-font";
import type { ReactNode } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { FLYER_FONT_SOURCES } from "@/lib/flyerFonts";
import { colors } from "@/constants/tokens";

export function FlyerFontsProvider({ children }: { children: ReactNode }) {
  const [loaded] = useFonts(FLYER_FONT_SOURCES);

  if (!loaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.dark.text} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.dark.background,
  },
});
