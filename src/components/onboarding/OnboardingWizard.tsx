import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { usePostHog } from "posthog-react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { api } from "../../../convex/_generated/api";
import { onboardingCopy as copy } from "@/constants/onboardingCopy";
import { onboardingTheme as theme } from "@/constants/onboardingTheme";
import { radius, spacing } from "@/constants/tokens";
import type { EventName } from "@/lib/analytics";
import { pickArtistProfileImage } from "@/lib/artistProfileMedia";
import {
  clearLocalOnboardingStep,
  getDefaultOnboardingStep,
  getLocalOnboardingStep,
  setLocalOnboardingCompleted,
  setLocalOnboardingStep,
} from "@/lib/onboarding";
import {
  ONBOARDING_STEP_COUNT,
  ONBOARDING_STEP_IDS,
  getOnboardingStepIndex,
  type OnboardingStepId,
  parseOnboardingStepId,
} from "@/lib/onboardingSteps";
import {
  completeAudioPrimer,
  completePhotosPrimer,
  setPrimerDeferred,
} from "@/lib/permissions";
import { saveOnboardingProfile } from "@/lib/saveOnboardingProfile";
import { pressScaleStyle } from "@/lib/pressFeedback";
import { useLocalSession } from "@/providers/localSession";
import { sleep } from "@/lib/utils";
import { FooterFade, ProgressSegments } from "./OnboardingVisuals";
import {
  ONBOARDING_BIO_INPUT_ACCESSORY_ID,
  StepFlowBody,
  StepPermAudioBody,
  StepPermPhotosBody,
  StepProfileBody,
  StepReadyBody,
  StepValueBody,
} from "./onboardingStepBodies";

export type OnboardingProfileDraft = {
  artistName: string;
  bio: string;
  avatarUri: string | null;
  heroUri: string | null;
};

type StepConfig = {
  id: OnboardingStepId;
  primaryLabel: string;
  secondaryLabel?: string;
  showArrow?: boolean;
};

const STEP_CONFIG: StepConfig[] = [
  { id: "value", primaryLabel: copy.value.cta },
  { id: "flow", primaryLabel: copy.flow.cta },
  { id: "perm-photos", primaryLabel: copy.permPhotos.cta, secondaryLabel: copy.notNow },
  { id: "perm-audio", primaryLabel: copy.permAudio.cta, secondaryLabel: copy.notNow },
  { id: "profile-setup", primaryLabel: copy.profileSetup.cta, secondaryLabel: copy.skipProfile },
  { id: "ready", primaryLabel: copy.ready.cta, showArrow: true },
];

type Props = {
  /** Dev preview from Profile — no completion persistence; closes via onPreviewClose. */
  previewMode?: boolean;
  onPreviewClose?: () => void;
};

export function OnboardingWizard({ previewMode = false, onPreviewClose }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();
  const { userId, getToken } = useAuth();
  const { user } = useUser();
  const { isAuthenticated } = useConvexAuth();
  const { isLocalGuest } = useLocalSession();
  const currentUser = useQuery(api.users.current);
  const completeOnboarding = useMutation(api.users.completeOnboarding);
  const updateProfile = useMutation(api.users.updateProfile);
  const getOrCreateUser = useMutation(api.users.getOrCreate);

  const [stepId, setStepId] = useState<OnboardingStepId>(getDefaultOnboardingStep());
  const [isHydrated, setIsHydrated] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isPickingAvatar, setIsPickingAvatar] = useState(false);
  const [isPickingBanner, setIsPickingBanner] = useState(false);
  const profileStartedRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const activeFieldRef = useRef<View | null>(null);
  const bioInputRef = useRef<TextInput>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [profile, setProfile] = useState<OnboardingProfileDraft>({
    artistName: "",
    bio: "",
    avatarUri: null,
    heroUri: null,
  });

  const stepIndex = getOnboardingStepIndex(stepId);
  const step = STEP_CONFIG[stepIndex];
  const isLast = stepIndex === STEP_CONFIG.length - 1;
  const isFirst = stepIndex === 0;

  const patchProfile = useCallback((patch: Partial<OnboardingProfileDraft>) => {
    setProfile((prev) => ({ ...prev, ...patch }));
  }, []);

  const isProfileStep = stepId === "profile-setup";

  const scrollFieldIntoView = useCallback(
    (fieldRef: RefObject<View | null>) => {
      const field = fieldRef.current;
      if (!field) return;
      activeFieldRef.current = field;

      const run = () => {
        field.measureInWindow((_x, fieldY, _w, fieldHeight) => {
          const windowHeight = Dimensions.get("window").height;
          const accessory = Platform.OS === "ios" ? 44 : 0;
          const keyboard = keyboardHeight > 0 ? keyboardHeight : 320;
          const keyboardTop = windowHeight - keyboard - accessory;
          const margin = spacing.lg;
          const fieldBottom = fieldY + fieldHeight;

          if (fieldBottom > keyboardTop - margin) {
            const delta = fieldBottom - keyboardTop + margin;
            const nextY = scrollYRef.current + delta;
            scrollYRef.current = nextY;
            scrollRef.current?.scrollTo({
              y: nextY,
              animated: true,
            });
          }
        });
      };

      requestAnimationFrame(run);
      if (Platform.OS === "ios") {
        setTimeout(run, 320);
      }
    },
    [keyboardHeight],
  );

  useEffect(() => {
    if (!isProfileStep || !isKeyboardVisible || keyboardHeight === 0 || !activeFieldRef.current) {
      return;
    }

    const field = activeFieldRef.current;
    const timer = setTimeout(() => {
      field.measureInWindow((_x, fieldY, _w, fieldHeight) => {
        const windowHeight = Dimensions.get("window").height;
        const accessory = Platform.OS === "ios" ? 44 : 0;
        const keyboardTop = windowHeight - keyboardHeight - accessory;
        const margin = spacing.lg;
        const fieldBottom = fieldY + fieldHeight;

        if (fieldBottom > keyboardTop - margin) {
          const delta = fieldBottom - keyboardTop + margin;
          const nextY = scrollYRef.current + delta;
          scrollYRef.current = nextY;
          scrollRef.current?.scrollTo({
            y: nextY,
            animated: true,
          });
        }
      });
    }, 50);

    return () => clearTimeout(timer);
  }, [isProfileStep, isKeyboardVisible, keyboardHeight]);

  const showFooter = !(isProfileStep && isKeyboardVisible);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (event) => {
      setIsKeyboardVisible(true);
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!isProfileStep) {
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
    }
  }, [isProfileStep]);

  useEffect(() => {
    if (previewMode) {
      setStepId(getDefaultOnboardingStep());
      profileStartedRef.current = false;
      setIsHydrated(true);
      return;
    }

    let active = true;
    (async () => {
      const saved = await getLocalOnboardingStep(userId, { localGuest: isLocalGuest });
      if (!active) return;
      if (saved) setStepId(saved);
      setIsHydrated(true);
    })();
    return () => {
      active = false;
    };
  }, [previewMode, userId, isLocalGuest]);

  useEffect(() => {
    if (!isHydrated || previewMode) return;
    void setLocalOnboardingStep(stepId, userId, { localGuest: isLocalGuest });
  }, [stepId, isHydrated, previewMode, userId, isLocalGuest]);

  useEffect(() => {
    if (stepId === "perm-photos" || stepId === "perm-audio") {
      posthog?.capture("permission_primer_viewed" satisfies EventName, {
        primer_id: stepId,
      });
    }
  }, [stepId, posthog]);

  useEffect(() => {
    if (stepId !== "profile-setup" || profileStartedRef.current) return;
    profileStartedRef.current = true;
    posthog?.capture("onboarding_profile_started" satisfies EventName);

    const clerkName = user?.fullName?.trim() || user?.firstName?.trim() || "";
    setProfile((prev) => ({
      ...prev,
      artistName: prev.artistName || clerkName,
    }));
  }, [stepId, posthog, user]);

  const ensureConvexUser = useCallback(async () => {
    const token = await getToken({ template: "convex" });
    if (!token) throw new Error("MissingConvexTemplate");
    if (!currentUser) {
      await getOrCreateUser({});
    }
  }, [getToken, currentUser, getOrCreateUser]);

  const persistCompletionToServer = useCallback(async () => {
    if (!isAuthenticated) return;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        await completeOnboarding({});
        return;
      } catch (error) {
        if (attempt === 2) {
          console.warn("Failed to persist onboarding completion:", error);
        } else {
          await sleep(250 * attempt);
        }
      }
    }
  }, [isAuthenticated, completeOnboarding]);

  const finishOnboarding = useCallback(
    async (method: "cta" | "skip", profileCompleted: boolean) => {
      if (previewMode) {
        onPreviewClose?.();
        router.replace("/(tabs)/create");
        return;
      }

      if (isFinishing) return;
      setIsFinishing(true);
      setIsBusy(true);

      await setLocalOnboardingCompleted(userId, { localGuest: isLocalGuest });
      await clearLocalOnboardingStep(userId, { localGuest: isLocalGuest });
      posthog?.capture("onboarding_completed" satisfies EventName, {
        method,
        profile_completed: String(profileCompleted),
      });
      await persistCompletionToServer();

      await sleep(900);
      router.replace("/(tabs)/create");
    },
    [
      isFinishing,
      previewMode,
      onPreviewClose,
      userId,
      isLocalGuest,
      posthog,
      persistCompletionToServer,
      router,
    ],
  );

  const goToStep = useCallback((next: OnboardingStepId) => {
    if (!parseOnboardingStepId(next)) return;
    setStepId(next);
  }, []);

  const goNext = useCallback(() => {
    const next = ONBOARDING_STEP_IDS[stepIndex + 1];
    if (next) goToStep(next);
  }, [stepIndex, goToStep]);

  const goBack = useCallback(() => {
    const prev = ONBOARDING_STEP_IDS[stepIndex - 1];
    if (prev) goToStep(prev);
  }, [stepIndex, goToStep]);

  const handleSkipHeader = useCallback(() => {
    goToStep("ready");
  }, [goToStep]);

  const handleSecondary = useCallback(async () => {
    if (stepId === "profile-setup") {
      posthog?.capture("onboarding_profile_skipped" satisfies EventName);
      goNext();
      return;
    }
    if (stepId === "perm-photos") {
      posthog?.capture("permission_primer_deferred" satisfies EventName, {
        primer_id: "perm-photos",
      });
      await setPrimerDeferred("perm-photos", userId, { localGuest: isLocalGuest });
      goNext();
      return;
    }
    if (stepId === "perm-audio") {
      posthog?.capture("permission_primer_deferred" satisfies EventName, {
        primer_id: "perm-audio",
      });
      await setPrimerDeferred("perm-audio", userId, { localGuest: isLocalGuest });
      goNext();
    }
  }, [stepId, posthog, userId, isLocalGuest, goNext]);

  const tapPrimary = useCallback(() => {
    if (Platform.OS === "ios") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const handlePrimary = useCallback(async () => {
    if (isBusy) return;
    tapPrimary();

    if (stepId === "perm-photos") {
      setIsBusy(true);
      const result = await completePhotosPrimer(userId, { localGuest: isLocalGuest });
      posthog?.capture("permission_primer_continue" satisfies EventName, {
        primer_id: "perm-photos",
        system_result: result,
      });
      setIsBusy(false);
      goNext();
      return;
    }

    if (stepId === "perm-audio") {
      setIsBusy(true);
      const result = await completeAudioPrimer(userId, { localGuest: isLocalGuest });
      posthog?.capture("permission_primer_continue" satisfies EventName, {
        primer_id: "perm-audio",
        system_result: result,
      });
      setIsBusy(false);
      goNext();
      return;
    }

    if (stepId === "profile-setup") {
      setIsBusy(true);
      try {
        await saveOnboardingProfile(
          {
            artistName: profile.artistName,
            bio: profile.bio,
            avatarImageUrl: profile.avatarUri,
            heroImageUrl: profile.heroUri,
          },
          {
            isLocalGuest,
            updateProfile,
            ensureUser: ensureConvexUser,
          },
        );
        posthog?.capture("onboarding_profile_completed" satisfies EventName, {
          has_avatar: String(Boolean(profile.avatarUri)),
          has_hero: String(Boolean(profile.heroUri)),
          has_bio: String(Boolean(profile.bio.trim())),
        });
        goNext();
      } catch (error) {
        console.warn("Profile save failed:", error);
        Alert.alert("Couldn't save", copy.profileSetup.saveError);
      } finally {
        setIsBusy(false);
      }
      return;
    }

    if (isLast) {
      void finishOnboarding("cta", true);
      return;
    }

    goNext();
  }, [
    isBusy,
    stepId,
    posthog,
    userId,
    isLocalGuest,
    goNext,
    profile,
    updateProfile,
    ensureConvexUser,
    isLast,
    finishOnboarding,
    tapPrimary,
  ]);

  const pickImage = useCallback(
    async (kind: "avatar" | "banner") => {
      const setPicking = kind === "avatar" ? setIsPickingAvatar : setIsPickingBanner;
      setPicking(true);
      try {
        const result = await pickArtistProfileImage(
          kind === "avatar" ? "artist-avatar.jpg" : "artist-hero.jpg",
          { clerkUserId: userId, localGuest: isLocalGuest },
        );
        if ("error" in result) {
          if (result.error === "denied") {
            Alert.alert(
              "Permission needed",
              "Allow photo access to add images.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Open Settings", onPress: () => void Linking.openSettings() },
              ],
            );
          }
          return;
        }
        patchProfile(
          kind === "avatar"
            ? { avatarUri: result.uri }
            : { heroUri: result.uri },
        );
      } finally {
        setPicking(false);
      }
    },
    [userId, isLocalGuest, patchProfile],
  );

  const primaryDisabled = useMemo(() => {
    if (stepId === "profile-setup") {
      return !profile.artistName.trim();
    }
    return false;
  }, [stepId, profile.artistName]);

  const body = useMemo(() => {
    switch (stepId) {
      case "value":
        return <StepValueBody />;
      case "flow":
        return <StepFlowBody />;
      case "perm-photos":
        return <StepPermPhotosBody />;
      case "perm-audio":
        return <StepPermAudioBody />;
      case "profile-setup":
        return (
          <StepProfileBody
            profile={profile}
            onChange={patchProfile}
            showGuestHelper={isLocalGuest}
            onPickBanner={() => void pickImage("banner")}
            onPickAvatar={() => void pickImage("avatar")}
            isPickingBanner={isPickingBanner}
            isPickingAvatar={isPickingAvatar}
            bioInputRef={bioInputRef}
            onScrollToField={scrollFieldIntoView}
          />
        );
      case "ready":
        return <StepReadyBody />;
      default:
        return null;
    }
  }, [
    stepId,
    profile,
    patchProfile,
    isLocalGuest,
    pickImage,
    isPickingBanner,
    isPickingAvatar,
    scrollFieldIntoView,
  ]);

  if (!isHydrated) {
    return (
      <SafeAreaView style={styles.loading} edges={["top", "bottom"]}>
        <ActivityIndicator size="large" color={theme.text} />
        <Text style={styles.loadingText}>{copy.loading}</Text>
      </SafeAreaView>
    );
  }

  if (isFinishing) {
    return (
      <SafeAreaView style={styles.loading} edges={["top", "bottom"]}>
        <View style={styles.finishIcon}>
          <Ionicons name="checkmark" size={34} color={theme.bg} />
        </View>
        <Text style={styles.loadingText}>{copy.openingApp}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerSide}>
          {!isFirst ? (
            <Pressable
              onPress={goBack}
              style={({ pressed }) => [styles.backBtn, pressScaleStyle(pressed)]}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={22} color={theme.text} />
            </Pressable>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>
        <Text style={styles.progress}>
          {stepIndex + 1}
          <Text style={styles.progressMuted}>
            {" "}
            {copy.progressOf} {ONBOARDING_STEP_COUNT}
          </Text>
        </Text>
        <View style={[styles.headerSide, styles.headerSideEnd]}>
          {previewMode ? (
            <Pressable
              onPress={() => onPreviewClose?.()}
              style={({ pressed }) => pressScaleStyle(pressed)}
              accessibilityRole="button"
              accessibilityLabel="Close preview"
            >
              <Text style={styles.skip} numberOfLines={1}>
                Close
              </Text>
            </Pressable>
          ) : !isLast ? (
            <Pressable
              onPress={handleSkipHeader}
              style={({ pressed }) => pressScaleStyle(pressed)}
              accessibilityRole="button"
              accessibilityLabel={copy.skip}
            >
              <Text style={styles.skip}>{copy.skip}</Text>
            </Pressable>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>
      </View>
      <ProgressSegments current={stepIndex + 1} total={ONBOARDING_STEP_COUNT} />

      <KeyboardAvoidingView
        style={styles.main}
        enabled={!isProfileStep}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top + 56}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.main}
          contentContainerStyle={[
            styles.scrollContent,
            stepId === "flow" && styles.scrollContentFlow,
            stepId !== "profile-setup" && stepId !== "flow" && styles.scrollContentCentered,
            isProfileStep &&
              isKeyboardVisible && {
                paddingBottom: keyboardHeight + (Platform.OS === "ios" ? 44 : 0) + spacing.xl,
              },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={isProfileStep ? "interactive" : "none"}
          onScroll={(event) => {
            scrollYRef.current = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          {body}
        </ScrollView>

        {showFooter ? (
          <View
            style={[
              styles.footer,
              { paddingBottom: Math.max(insets.bottom, spacing.lg) },
            ]}
          >
            <FooterFade />
            {step.secondaryLabel ? (
              <Pressable
                onPress={() => void handleSecondary()}
                disabled={isBusy}
                style={({ pressed }) => [styles.secondaryBtn, pressScaleStyle(pressed)]}
              >
                <Text style={styles.secondaryLabel}>{step.secondaryLabel}</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => void handlePrimary()}
              disabled={primaryDisabled || isBusy}
              style={({ pressed }) => [
                styles.primaryBtn,
                !primaryDisabled && !isBusy && theme.shadow.cta,
                (primaryDisabled || isBusy) && styles.primaryBtnDisabled,
                pressScaleStyle(pressed && !primaryDisabled && !isBusy),
              ]}
              accessibilityRole="button"
            >
              {isBusy ? (
                <ActivityIndicator size="small" color={theme.ctaOnFill} />
              ) : (
                <View style={styles.primaryRow}>
                  <Text style={styles.primaryLabel}>{step.primaryLabel}</Text>
                  {step.showArrow ? (
                    <Ionicons name="arrow-forward" size={18} color={theme.ctaOnFill} />
                  ) : null}
                </View>
              )}
            </Pressable>
          </View>
        ) : null}
      </KeyboardAvoidingView>

      {Platform.OS === "ios" ? (
        <InputAccessoryView nativeID={ONBOARDING_BIO_INPUT_ACCESSORY_ID}>
          <View style={styles.bioAccessory}>
            <Pressable
              onPress={() => {
                bioInputRef.current?.blur();
                Keyboard.dismiss();
              }}
              accessibilityLabel="Dismiss keyboard"
              accessibilityRole="button"
            >
              <Text style={styles.bioAccessoryDone}>Done</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  main: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  root: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  loading: {
    flex: 1,
    backgroundColor: theme.bg,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 15,
    color: theme.textSecondary,
  },
  finishIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.text,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    columnGap: spacing.sm,
  },
  headerSide: {
    width: 40,
    alignItems: "flex-start",
  },
  headerSideEnd: {
    width: 56,
    minWidth: 56,
    flexShrink: 0,
    alignItems: "flex-end",
  },
  headerSpacer: {
    width: 36,
    height: 36,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadow.card,
  },
  progress: {
    flex: 1,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
    color: theme.text,
    letterSpacing: 0.3,
  },
  progressMuted: {
    fontWeight: "500",
    color: theme.textSecondary,
  },
  skip: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.textSecondary,
    flexShrink: 0,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.sm,
  },
  scrollContentCentered: {
    justifyContent: "center",
    paddingVertical: spacing.xs,
  },
  scrollContentFlow: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 0,
  },
  bioAccessory: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: theme.surfaceMuted,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
  },
  bioAccessoryDone: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.accentLink,
  },
  footer: {
    position: "relative",
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
    backgroundColor: theme.bg,
  },
  secondaryBtn: {
    alignItems: "center",
    paddingVertical: 4,
    paddingBottom: 12,
  },
  secondaryLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.textSecondary,
  },
  primaryBtn: {
    height: 54,
    borderRadius: radius.md,
    backgroundColor: theme.ctaFill,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnDisabled: {
    opacity: 0.32,
  },
  primaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  primaryLabel: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
    color: theme.ctaOnFill,
  },
});
