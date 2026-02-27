import AsyncStorage from "@react-native-async-storage/async-storage";

const LOCAL_ONBOARDING_KEY_PREFIX = "musicpromo:onboarding-complete";

function localOnboardingKey(clerkUserId: string) {
  return `${LOCAL_ONBOARDING_KEY_PREFIX}:${clerkUserId}`;
}

export async function getLocalOnboardingCompleted(
  clerkUserId?: string | null
): Promise<boolean> {
  if (!clerkUserId) return false;

  try {
    const value = await AsyncStorage.getItem(localOnboardingKey(clerkUserId));
    return value === "1";
  } catch (error) {
    console.warn("Failed to read local onboarding completion state:", error);
    return false;
  }
}

export async function setLocalOnboardingCompleted(
  clerkUserId?: string | null
): Promise<boolean> {
  if (!clerkUserId) return false;

  try {
    await AsyncStorage.setItem(localOnboardingKey(clerkUserId), "1");
    return true;
  } catch (error) {
    console.warn("Failed to persist local onboarding completion state:", error);
    return false;
  }
}
