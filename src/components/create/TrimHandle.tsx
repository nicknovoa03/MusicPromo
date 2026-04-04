import { StyleSheet, View } from "react-native";
import { colors, radius } from "@/constants/tokens";

interface TrimHandleProps {
  side: "left" | "right";
}

export function TrimHandle({ side }: TrimHandleProps) {
  return (
    <View
      style={[
        styles.handle,
        side === "left" ? styles.handleLeft : styles.handleRight,
      ]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <View style={styles.grip} />
    </View>
  );
}

const styles = StyleSheet.create({
  handle: {
    width: 18,
    height: "100%",
    backgroundColor: colors.accent.primaryMuted,
    borderWidth: 1,
    borderColor: colors.brand.tintStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  handleLeft: {
    borderTopLeftRadius: radius.md,
    borderBottomLeftRadius: radius.md,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  handleRight: {
    borderTopRightRadius: radius.md,
    borderBottomRightRadius: radius.md,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  grip: {
    width: 3.5,
    height: 22,
    borderRadius: radius.full,
    backgroundColor: "rgba(16,35,23,0.45)",
  },
});
