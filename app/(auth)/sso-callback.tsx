import { useSSO } from "@clerk/clerk-expo";
import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";

export default function SSOCallback() {
  const { handleRedirectCallback } = useSSO();

  useEffect(() => {
    void handleRedirectCallback();
  }, [handleRedirectCallback]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color="#C8C8C8" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0E0C0A",
    justifyContent: "center",
    alignItems: "center",
  },
});
