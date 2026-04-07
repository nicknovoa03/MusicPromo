import AsyncStorage from "@react-native-async-storage/async-storage";

// Bump this whenever new onboarding slides are added. Existing users whose
// stored version is below this number will be shown onboarding again.
export const CURRENT_ONBOARDING_VERSION = 2;

const LOCAL_ONBOARDING_KEY_PREFIX = "musicpromo:onboarding-complete";
const LOCAL_GUEST_ONBOARDING_KEY = `${LOCAL_ONBOARDING_KEY_PREFIX}:local-guest`;

function localOnboardingKey(clerkUserId: string) {
  return `${LOCAL_ONBOARDING_KEY_PREFIX}:${clerkUserId}`;
}

type OnboardingLocalOptions = {
  localGuest?: boolean;
};

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
    return true;
  } catch (error) {
    console.warn("Failed to clear local onboarding completion state:", error);
    return false;
  }
}
