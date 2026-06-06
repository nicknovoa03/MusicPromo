import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ONBOARDING_STEP_IDS,
  type OnboardingStepId,
  parseOnboardingStepId,
} from "./onboardingSteps";

// Bump when onboarding content/flow changes. Existing users below this version see onboarding again.
export const CURRENT_ONBOARDING_VERSION = 3;

/** Previous carousel-only flow. */
export const LEGACY_ONBOARDING_VERSION = 2;

const LOCAL_ONBOARDING_KEY_PREFIX = "musicpromo:onboarding-complete";
const LOCAL_ONBOARDING_STEP_KEY_PREFIX = "musicpromo:onboarding-step";
const LOCAL_GUEST_ONBOARDING_KEY = `${LOCAL_ONBOARDING_KEY_PREFIX}:local-guest`;
const LOCAL_GUEST_ONBOARDING_STEP_KEY = `${LOCAL_ONBOARDING_STEP_KEY_PREFIX}:local-guest`;

function localOnboardingKey(clerkUserId: string) {
  return `${LOCAL_ONBOARDING_KEY_PREFIX}:${clerkUserId}`;
}

type OnboardingLocalOptions = {
  localGuest?: boolean;
};

export type OnboardingCompletionCache = {
  userId: string | null | undefined;
  isLocalGuest: boolean;
  completed: boolean;
};

// Survive remount so tabs don't flash the loading gate; must stay in sync with writes.
let onboardingCompletionCache: OnboardingCompletionCache | null = null;

function normalizeCacheUserId(clerkUserId?: string | null) {
  return clerkUserId ?? null;
}

function matchesOnboardingSession(
  cache: OnboardingCompletionCache,
  clerkUserId?: string | null,
  options?: OnboardingLocalOptions,
) {
  return (
    cache.userId === normalizeCacheUserId(clerkUserId) &&
    cache.isLocalGuest === Boolean(options?.localGuest)
  );
}

export function getCachedOnboardingCompletion(
  clerkUserId?: string | null,
  options?: OnboardingLocalOptions,
): OnboardingCompletionCache | null {
  if (
    onboardingCompletionCache &&
    matchesOnboardingSession(onboardingCompletionCache, clerkUserId, options)
  ) {
    return onboardingCompletionCache;
  }
  return null;
}

export function setCachedOnboardingCompletion(
  clerkUserId: string | null | undefined,
  isLocalGuest: boolean,
  completed: boolean,
) {
  onboardingCompletionCache = {
    userId: normalizeCacheUserId(clerkUserId),
    isLocalGuest,
    completed,
  };
}

function resolveLocalOnboardingKey(
  clerkUserId?: string | null,
  options?: OnboardingLocalOptions
) {
  if (clerkUserId) return localOnboardingKey(clerkUserId);
  if (options?.localGuest) return LOCAL_GUEST_ONBOARDING_KEY;
  return null;
}

export async function getLocalOnboardingVersion(
  clerkUserId?: string | null,
  options?: OnboardingLocalOptions
): Promise<number> {
  const key = resolveLocalOnboardingKey(clerkUserId, options);
  if (!key) return 0;

  try {
    const value = await AsyncStorage.getItem(key);
    if (!value) return 0;
    // Legacy: old flag stored "1" as a boolean string → treat as version 1
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 1 : parsed;
  } catch (error) {
    console.warn("Failed to read local onboarding version:", error);
    return 0;
  }
}

export async function getLocalOnboardingCompleted(
  clerkUserId?: string | null,
  options?: OnboardingLocalOptions
): Promise<boolean> {
  const version = await getLocalOnboardingVersion(clerkUserId, options);
  return version >= CURRENT_ONBOARDING_VERSION;
}

export async function setLocalOnboardingCompleted(
  clerkUserId?: string | null,
  options?: OnboardingLocalOptions
): Promise<boolean> {
  const key = resolveLocalOnboardingKey(clerkUserId, options);
  if (!key) return false;

  try {
    await AsyncStorage.setItem(key, String(CURRENT_ONBOARDING_VERSION));
    setCachedOnboardingCompletion(
      clerkUserId,
      Boolean(options?.localGuest),
      true,
    );
    return true;
  } catch (error) {
    console.warn("Failed to persist local onboarding completion state:", error);
    return false;
  }
}

export async function clearLocalOnboardingCompleted(
  clerkUserId?: string | null,
  options?: OnboardingLocalOptions
): Promise<boolean> {
  const key = resolveLocalOnboardingKey(clerkUserId, options);
  if (!key) return false;

  try {
    await AsyncStorage.removeItem(key);
    setCachedOnboardingCompletion(
      clerkUserId,
      Boolean(options?.localGuest),
      false,
    );
    return true;
  } catch (error) {
    console.warn("Failed to clear local onboarding completion state:", error);
    return false;
  }
}

function localOnboardingStepKey(clerkUserId: string) {
  return `${LOCAL_ONBOARDING_STEP_KEY_PREFIX}:${clerkUserId}`;
}

function resolveLocalOnboardingStepKey(
  clerkUserId?: string | null,
  options?: OnboardingLocalOptions,
) {
  if (clerkUserId) return localOnboardingStepKey(clerkUserId);
  if (options?.localGuest) return LOCAL_GUEST_ONBOARDING_STEP_KEY;
  return null;
}

export async function getLocalOnboardingStep(
  clerkUserId?: string | null,
  options?: OnboardingLocalOptions,
): Promise<OnboardingStepId | null> {
  const key = resolveLocalOnboardingStepKey(clerkUserId, options);
  if (!key) return null;

  try {
    const value = await AsyncStorage.getItem(key);
    return parseOnboardingStepId(value);
  } catch (error) {
    console.warn("Failed to read onboarding step:", error);
    return null;
  }
}

export async function setLocalOnboardingStep(
  stepId: OnboardingStepId,
  clerkUserId?: string | null,
  options?: OnboardingLocalOptions,
): Promise<boolean> {
  const key = resolveLocalOnboardingStepKey(clerkUserId, options);
  if (!key) return false;

  try {
    await AsyncStorage.setItem(key, stepId);
    return true;
  } catch (error) {
    console.warn("Failed to persist onboarding step:", error);
    return false;
  }
}

export async function clearLocalOnboardingStep(
  clerkUserId?: string | null,
  options?: OnboardingLocalOptions,
): Promise<boolean> {
  const key = resolveLocalOnboardingStepKey(clerkUserId, options);
  if (!key) return false;

  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn("Failed to clear onboarding step:", error);
    return false;
  }
}

/** First step when no resume state exists. */
export function getDefaultOnboardingStep(): OnboardingStepId {
  return ONBOARDING_STEP_IDS[0];
}
