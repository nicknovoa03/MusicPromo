import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSSO, useSignIn } from "@clerk/clerk-expo";
import { usePostHog } from "posthog-react-native";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, spacing, radius } from "@/constants/tokens";

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const { startSSOFlow } = useSSO();
  const { signIn, setActive } = useSignIn();
  const posthog = usePostHog();
  const [loading, setLoading] = useState<"apple" | "google" | "guest" | null>(
    null
  );

  const handleSSO = useCallback(
    async (strategy: "oauth_apple" | "oauth_google") => {
      const provider = strategy === "oauth_apple" ? "apple" : "google";
      setLoading(provider);
      try {
        const { createdSessionId, setActive: ssoSetActive } =
          await startSSOFlow({ strategy });

        if (createdSessionId) {
          await ssoSetActive!({ session: createdSessionId });
          posthog?.capture("sign_in_completed", { provider });
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Sign-in failed. Try again.";
        Alert.alert("Sign-in error", message);
      } finally {
        setLoading(null);
      }
    },
    [startSSOFlow, posthog]
  );

  const handleGuest = useCallback(async () => {
    setLoading("guest");
    try {
      if (!signIn) return;
      const { createdSessionId } = await signIn.create({
        strategy: "ticket",
        ticket: "__clerk_anonymous",
      });
      if (createdSessionId) {
        await setActive!({ session: createdSessionId });
        posthog?.capture("guest_mode_started");
      }
    } catch {
      // Guest mode via anonymous sign-in: if ticket strategy fails,
      // fall back to displaying an error.
      Alert.alert(
        "Guest mode unavailable",
        "Please sign in with Apple or Google."
      );
    } finally {
      setLoading(null);
    }
  }, [signIn, setActive, posthog]);

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.logoContainer}>
          <Ionicons name="musical-notes" size={48} color={colors.accent.primary} />
        </View>
        <Text style={styles.title}>MusicPromo</Text>
        <Text style={styles.subtitle}>
          Turn a photo and audio clip into a promo video in seconds
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.appleButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => handleSSO("oauth_apple")}
          disabled={loading !== null}
          accessibilityLabel="Sign in with Apple"
          accessibilityRole="button"
        >
          {loading === "apple" ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons
                name="logo-apple"
                size={20}
                color="#FFFFFF"
                style={styles.buttonIcon}
              />
              <Text style={styles.appleButtonText}>Sign in with Apple</Text>
            </>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.googleButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => handleSSO("oauth_google")}
          disabled={loading !== null}
          accessibilityLabel="Sign in with Google"
          accessibilityRole="button"
        >
          {loading === "google" ? (
            <ActivityIndicator color={colors.light.text} />
          ) : (
            <>
              <Ionicons
                name="logo-google"
                size={20}
                color={colors.light.text}
                style={styles.buttonIcon}
              />
              <Text style={styles.googleButtonText}>Sign in with Google</Text>
            </>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.guestButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleGuest}
          disabled={loading !== null}
          accessibilityLabel="Continue as Guest"
          accessibilityRole="button"
        >
          {loading === "guest" ? (
            <ActivityIndicator color={colors.light.textSecondary} />
          ) : (
            <Text style={styles.guestButtonText}>Continue as Guest</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  hero: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  logoContainer: {
    width: 88,
    height: 88,
    borderRadius: radius.lg,
    backgroundColor: colors.light.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.light.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.light.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },
  actions: {
    gap: spacing.md,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  buttonIcon: {
    marginRight: spacing.sm,
  },
  appleButton: {
    backgroundColor: "#000000",
  },
  appleButtonText: {
    ...typography.button,
    color: "#FFFFFF",
  },
  googleButton: {
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  googleButtonText: {
    ...typography.button,
    color: colors.light.text,
  },
  guestButton: {
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: radius.md,
  },
  guestButtonText: {
    ...typography.button,
    color: colors.light.textSecondary,
  },
});
