import { Platform, View, StyleSheet } from "react-native";
import type { ReactNode } from "react";

const PHONE_WIDTH = 430;

type FlyerWebPreviewFrameProps = {
  children: ReactNode;
};

/** Centers flyer screens in a phone-width column when running on web in dev. */
export function FlyerWebPreviewFrame({ children }: FlyerWebPreviewFrameProps) {
  if (Platform.OS !== "web" || !__DEV__) {
    return <>{children}</>;
  }

  return (
    <View style={styles.outer}>
      <View style={styles.phone}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#111",
  },
  phone: {
    flex: 1,
    width: "100%",
    maxWidth: PHONE_WIDTH,
  },
});
