import { View, Text, StyleSheet } from "react-native";

type FlyerWatermarkProps = {
  dark?: boolean;
};

export function FlyerWatermark({ dark = true }: FlyerWatermarkProps) {
  return (
    <View
      style={[
        styles.wrap,
        dark ? styles.wrapDark : styles.wrapLight,
      ]}
      pointerEvents="none"
    >
      <Text style={[styles.text, dark ? styles.textDark : styles.textLight]}>
        MusicPromo
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    bottom: 10,
    right: 10,
    zIndex: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 3,
  },
  wrapDark: {
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  wrapLight: {
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  text: {
    fontSize: 8,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  textDark: {
    color: "rgba(255,255,255,0.55)",
  },
  textLight: {
    color: "rgba(0,0,0,0.45)",
  },
});
