import AsyncStorage from "@react-native-async-storage/async-storage";

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

export async function getLocalOnboardingCompleted(
  clerkUserId?: string | null,
  options?: OnboardingLocalOptions
): Promise<boolean> {
  const key = resolveLocalOnboardingKey(clerkUserId, options);
  if (!key) return false;

  try {
    const value = await AsyncStorage.getItem(key);
    return value === "1";
  } catch (error) {
    console.warn("Failed to read local onboarding completion state:", error);
    return false;
  }
}

export async function setLocalOnboardingCompleted(
  clerkUserId?: string | null,
  options?: OnboardingLocalOptions
): Promise<boolean> {
  const key = resolveLocalOnboardingKey(clerkUserId, options);
  if (!key) return false;

  try {
    await AsyncStorage.setItem(key, "1");
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
