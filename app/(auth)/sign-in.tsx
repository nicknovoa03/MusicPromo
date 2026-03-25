import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  isClerkAPIResponseError,
  useSSO,
  useSignIn,
  useSignUp,
} from "@clerk/clerk-expo";
import { usePostHog } from "posthog-react-native";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, typography, spacing, radius } from "@/constants/tokens";
import { useLocalSession } from "@/providers/localSession";
import { isRunningInExpoGo } from "@/lib/runtimeEnvironment";

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const { startSSOFlow } = useSSO();
  const { signIn, setActive } = useSignIn();
  const { signUp } = useSignUp();
  const { startLocalGuest, clearLocalSession } = useLocalSession();
  const posthog = usePostHog();
  const [loading, setLoading] = useState<"apple" | "google" | "guest" | null>(
    null
  );
  const ssoRedirectUrl = AuthSession.makeRedirectUri({
    path: "sso-callback",
    scheme: "musicpromo",
  });
  const handleSSO = useCallback(
    async (strategy: "oauth_apple" | "oauth_google") => {
      const provider = strategy === "oauth_apple" ? "apple" : "google";
      setLoading(provider);
      if (isRunningInExpoGo()) {
        Alert.alert(
          "Dev build required for OAuth",
          "Apple/Google sign-in needs a development build or production build (not Expo Go). Use `npm run start:dev-client:tunnel`."
        );
        setLoading(null);
        return;
      }
      try {
        const { createdSessionId, setActive: ssoSetActive } =
          await startSSOFlow({ strategy, redirectUrl: ssoRedirectUrl });

        if (createdSessionId && ssoSetActive) {
          try {
            await clearLocalSession();
          } catch (cleanupError) {
            console.warn(
              "Failed to clear local session before SSO activation:",
              cleanupError
            );
          }
          await ssoSetActive({ session: createdSessionId });
          posthog?.capture("sign_in_completed", { provider });
        } else if (createdSessionId) {
          Alert.alert(
            "Sign-in error",
            "Session was created but could not be activated. Please try again."
          );
        } else {
          Alert.alert(
            "Sign-in incomplete",
            "Sign-in did not complete. Please try again."
          );
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Sign-in failed. Try again.";

        if (message.includes("Missing external verification redirect URL")) {
          Alert.alert(
            "Sign-in configuration needed",
            [
              "Clerk did not return an SSO redirect URL for this auth attempt.",
              `Add this redirect URL in Clerk and try again:\n${ssoRedirectUrl}`,
              "If you are using Expo Go, use a development build for more reliable OAuth deep links.",
            ].join("\n\n")
          );
          return;
        }

        Alert.alert("Sign-in error", message);
      } finally {
        setLoading(null);
      }
    },
    [startSSOFlow, posthog, clearLocalSession, ssoRedirectUrl]
  );

  const handleGuest = useCallback(async () => {
    setLoading("guest");
    try {
      if (!setActive || (!signIn && !signUp)) {
        throw new Error("Auth is still loading. Please try again.");
      }

      let createdSessionId: string | null = null;

      if (signIn) {
        const signInResult = await signIn.create({
          strategy: "ticket",
          ticket: "__clerk_anonymous",
        });

        if (signInResult.status === "complete" && signInResult.createdSessionId) {
          createdSessionId = signInResult.createdSessionId;
        }
      }

      if (!createdSessionId && signUp) {
        const signUpResult = await signUp.create({
          strategy: "ticket",
          ticket: "__clerk_anonymous",
        });

        if (signUpResult.status === "complete" && signUpResult.createdSessionId) {
          createdSessionId = signUpResult.createdSessionId;
        }
      }

      if (!createdSessionId) {
        throw new Error("Guest sign-in could not be completed.");
      }

      try {
        await clearLocalSession();
      } catch (cleanupError) {
        console.warn(
          "Failed to clear local session before guest activation:",
          cleanupError
        );
      }
      await setActive({ session: createdSessionId });
      posthog?.capture("guest_mode_started", { mode: "clerk" });
      return;
    } catch (err: unknown) {
      const startedLocalGuest = await startLocalGuest();
      if (startedLocalGuest) {
        posthog?.capture("guest_mode_started", { mode: "local" });
        return;
      }

      let message = "Please sign in with Apple or Google.";

      if (isClerkAPIResponseError(err)) {
        const primaryError = err.errors[0];
        const code = primaryError?.code ?? "";
        const longMessage = primaryError?.longMessage ?? primaryError?.message;
        const text = `${code} ${longMessage ?? ""}`.toLowerCase();

        if (text.includes("anonymous") || text.includes("ticket")) {
          message =
            "Anonymous guest sign-in appears disabled for this Clerk app. Enable guest/anonymous access in Clerk, then try again.";
        } else if (longMessage) {
          message = longMessage;
        }

        console.warn("Guest sign-in Clerk error:", {
          code,
          errors: err.errors,
        });
      } else if (err instanceof Error && err.message) {
        message = err.message;
        console.warn("Guest sign-in error:", err);
      }

      Alert.alert("Guest mode unavailable", message);
    } finally {
      setLoading(null);
    }
  }, [signIn, signUp, setActive, posthog, startLocalGuest, clearLocalSession]);

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.logoContainer}>
          <Ionicons name="musical-notes" size={48} color={colors.accent.fill} />
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
            <ActivityIndicator color={colors.accent.onFill} />
          ) : (
            <>
              <Ionicons
                name="logo-apple"
                size={20}
                color={colors.accent.onFill}
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
    backgroundColor: colors.accent.fill,
  },
  appleButtonText: {
    ...typography.button,
    color: colors.accent.onFill,
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
