import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuth } from "@clerk/clerk-expo";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { api } from "../convex/_generated/api";
import { colors, radius, spacing, typography } from "@/constants/tokens";
import type { EventName } from "@/lib/analytics";
import {
  getLocalOnboardingCompleted,
  setLocalOnboardingCompleted,
} from "@/lib/onboarding";
import { useLocalSession } from "@/providers/localSession";
import { sleep } from "@/lib/utils";

type CompletionMethod = "skip" | "cta";

type OnboardingSlide = {
  id: string;
  title: string;
  body: string;
  eyebrow: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: "value",
    eyebrow: "Fast Start",
    title: "Turn one photo and one track into a promo in seconds",
    body: "Pick a cover image, add your audio, and get a social-ready clip without opening a full editor.",
    icon: "sparkles-outline",
  },
  {
    id: "flow",
    eyebrow: "Simple Flow",
    title: "Pick media, trim, export, and share",
    body: "Stay focused on your release. MusicPromo keeps the process short so you can post faster.",
    icon: "musical-notes-outline",
  },
  {
    id: "ready",
    eyebrow: "You Are Set",
    title: "Your first promo is one tap away",
    body: "When you are ready, open Create and start building.",
    icon: "rocket-outline",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { userId } = useAuth();
  const { isAuthenticated } = useConvexAuth();
  const { isLocalGuest } = useLocalSession();
  const posthog = usePostHog();
  const currentUser = useQuery(api.users.current);
  const completeOnboarding = useMutation(api.users.completeOnboarding);
  const listRef = useRef<FlatList<OnboardingSlide>>(null);
  const hasRedirectedRef = useRef(false);
  const isMountedRef = useRef(true);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [localCompletionReady, setLocalCompletionReady] = useState(false);
  const [localCompletion, setLocalCompletion] = useState(false);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    setLocalCompletionReady(false);

    (async () => {
      try {
        const completed = await getLocalOnboardingCompleted(userId, {
          localGuest: isLocalGuest,
        });
        if (!isActive) return;
        setLocalCompletion(completed);
      } catch (error) {
        console.warn("Failed to read onboarding state:", error);
      } finally {
        if (isActive) setLocalCompletionReady(true);
      }
    })();

    return () => {
      isActive = false;
    };
  }, [userId, isLocalGuest]);

  const hasServerCompletion =
    isAuthenticated && Boolean(currentUser?.onboardingCompletedAt);
  const isOnboardingCompleted = localCompletion || hasServerCompletion;
  const hasCompletionState = localCompletionReady && (
    isLocalGuest
      ? true
      : isOnboardingCompleted || currentUser !== undefined
  );

  useEffect(() => {
    if (!hasCompletionState || !isOnboardingCompleted || hasRedirectedRef.current) {
      return;
    }

    hasRedirectedRef.current = true;
    router.replace("/");
  }, [hasCompletionState, isOnboardingCompleted, router]);

  const persistCompletionToServer = useCallback(async () => {
    if (!isAuthenticated) return;

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        await completeOnboarding({});
        return;
      } catch (error) {
        if (attempt === 2) {
          console.warn("Failed to persist onboarding completion to Convex:", error);
          return;
        }

        await sleep(250 * attempt);
      }
    }
  }, [isAuthenticated, completeOnboarding]);

  const finishOnboarding = useCallback(
    async (method: CompletionMethod) => {
      if (isCompleting) return;

      setIsCompleting(true);
      setLocalCompletion(true);

      await setLocalOnboardingCompleted(userId, { localGuest: isLocalGuest });
      posthog?.capture("onboarding_completed" satisfies EventName, { method });

      await persistCompletionToServer();
      router.replace("/");
      if (isMountedRef.current) {
        setIsCompleting(false);
      }
    },
    [
      isCompleting,
      persistCompletionToServer,
      posthog,
      router,
      userId,
      isLocalGuest,
    ]
  );

  const handleNext = useCallback(() => {
    if (currentIndex >= ONBOARDING_SLIDES.length - 1) {
      finishOnboarding("cta").catch((error) => {
        console.warn("Failed to complete onboarding:", error);
      });
      return;
    }

    listRef.current?.scrollToOffset({
      offset: (currentIndex + 1) * width,
      animated: true,
    });
  }, [currentIndex, finishOnboarding, width]);

  const handleSkip = useCallback(() => {
    finishOnboarding("skip").catch((error) => {
      console.warn("Failed to skip onboarding:", error);
    });
  }, [finishOnboarding]);

  const renderSlide = useCallback(
    ({ item }: { item: OnboardingSlide }) => {
      return (
        <View style={[styles.slide, { width }]}>
          <View style={styles.card}>
            <View style={styles.iconShell}>
              <Ionicons name={item.icon} size={32} color={colors.light.text} />
            </View>
            <Text style={styles.eyebrow}>{item.eyebrow}</Text>
            <Text style={styles.slideTitle}>{item.title}</Text>
            <Text style={styles.slideBody}>{item.body}</Text>

            {item.id === "flow" ? (
              <View style={styles.flowRow}>
                {["Pick", "Trim", "Export", "Share"].map((step) => (
                  <View key={step} style={styles.flowPill}>
                    <Text style={styles.flowPillText}>{step}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      );
    },
    [width]
  );

  if (!hasCompletionState) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={["top", "bottom"]}>
        <ActivityIndicator size="large" color={colors.light.text} />
        <Text style={styles.loadingText}>Preparing your workspace...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.backdropBlobA} />
      <View style={styles.backdropBlobB} />

      <View style={styles.header}>
        <Text style={styles.stepCounter}>
          {currentIndex + 1}/{ONBOARDING_SLIDES.length}
        </Text>
        <Pressable
          style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}
          onPress={handleSkip}
          disabled={isCompleting}
          accessibilityLabel="Skip onboarding"
          accessibilityRole="button"
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={ONBOARDING_SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const page = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(Math.max(0, Math.min(ONBOARDING_SLIDES.length - 1, page)));
        }}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {ONBOARDING_SLIDES.map((slide, index) => (
            <View
              key={slide.id}
              style={[styles.dot, index === currentIndex && styles.dotActive]}
            />
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
            isCompleting && styles.primaryButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={isCompleting}
          accessibilityRole="button"
          accessibilityLabel={
            currentIndex === ONBOARDING_SLIDES.length - 1
              ? "Start creating"
              : "Continue to next onboarding step"
          }
        >
          {isCompleting ? (
            <ActivityIndicator size="small" color={colors.accent.onPrimary} />
          ) : (
            <Text style={styles.primaryButtonText}>
              {currentIndex === ONBOARDING_SLIDES.length - 1
                ? "Start Creating"
                : "Next"}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.light.background,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    color: colors.light.textSecondary,
  },
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  backdropBlobA: {
    position: "absolute",
    top: -100,
    right: -70,
    width: 260,
    height: 260,
    borderRadius: radius.full,
    backgroundColor: colors.brand.tintStrong,
  },
  backdropBlobB: {
    position: "absolute",
    bottom: -130,
    left: -90,
    width: 300,
    height: 300,
    borderRadius: radius.full,
    backgroundColor: colors.brand.tint,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  stepCounter: {
    ...typography.caption,
    color: colors.light.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "600",
  },
  skipButton: {
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.overlay.light,
  },
  skipButtonText: {
    ...typography.caption,
    color: colors.light.text,
    fontWeight: "600",
  },
  slide: {
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
  },
  card: {
    backgroundColor: colors.overlay.lightStrong,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.overlay.lightStrong,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
    minHeight: 430,
    shadowColor: "#0F2B1A",
    shadowOpacity: 0.09,
    shadowOffset: { width: 0, height: 18 },
    shadowRadius: 24,
    elevation: 8,
  },
  iconShell: {
    width: 68,
    height: 68,
    borderRadius: radius.full,
    backgroundColor: colors.accent.primaryMuted,
    borderWidth: 1,
    borderColor: colors.brand.tintStrong,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  eyebrow: {
    ...typography.caption,
    color: colors.light.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
    fontWeight: "600",
  },
  slideTitle: {
    ...typography.h1,
    color: colors.light.text,
    marginBottom: spacing.md,
    lineHeight: 36,
  },
  slideBody: {
    ...typography.body,
    color: colors.light.textSecondary,
    lineHeight: 24,
  },
  flowRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  flowPill: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  flowPillText: {
    ...typography.caption,
    color: colors.light.text,
    fontWeight: "600",
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.light.border,
  },
  dotActive: {
    width: 28,
    backgroundColor: colors.light.text,
  },
  primaryButton: {
    height: 56,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent.primary,
    shadowColor: colors.accent.primary,
    shadowOpacity: 0.28,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 6,
  },
  primaryButtonDisabled: {
    opacity: 0.72,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.accent.onPrimary,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});
