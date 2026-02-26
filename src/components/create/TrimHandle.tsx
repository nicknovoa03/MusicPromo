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
      accessibilityLabel={`${side} trim handle`}
      accessibilityRole="adjustable"
    >
      <View style={styles.grip} />
    </View>
  );
}

const styles = StyleSheet.create({
  handle: {
    width: 16,
    height: "100%",
    backgroundColor: colors.accent.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  handleLeft: {
    borderTopLeftRadius: radius.sm,
    borderBottomLeftRadius: radius.sm,
  },
  handleRight: {
    borderTopRightRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
  },
  grip: {
    width: 3,
    height: 20,
    borderRadius: 1.5,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
});
