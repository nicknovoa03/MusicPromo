/** Wizard step order — bump CURRENT_ONBOARDING_VERSION when shipping new flow. */
export const ONBOARDING_STEP_IDS = [
  "value",
  "flow",
  "perm-photos",
  "perm-audio",
  "profile-setup",
  "ready",
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEP_IDS)[number];

export const ONBOARDING_STEP_COUNT = ONBOARDING_STEP_IDS.length;

export function getOnboardingStepIndex(stepId: OnboardingStepId): number {
  return ONBOARDING_STEP_IDS.indexOf(stepId);
}

export function getOnboardingProgress(stepId: OnboardingStepId): number {
  const index = getOnboardingStepIndex(stepId);
  if (index < 0) return 0;
  return (index + 1) / ONBOARDING_STEP_COUNT;
}

export function getNextOnboardingStep(
  stepId: OnboardingStepId,
): OnboardingStepId | null {
  const index = getOnboardingStepIndex(stepId);
  if (index < 0 || index >= ONBOARDING_STEP_IDS.length - 1) return null;
  return ONBOARDING_STEP_IDS[index + 1];
}

export function isStoryStep(stepId: OnboardingStepId): boolean {
  return stepId === "value" || stepId === "flow" || stepId === "ready";
}

export function isPermissionPrimerStep(
  stepId: OnboardingStepId,
): stepId is "perm-photos" | "perm-audio" {
  return stepId === "perm-photos" || stepId === "perm-audio";
}

export function parseOnboardingStepId(value: string | null | undefined): OnboardingStepId | null {
  if (!value) return null;
  return ONBOARDING_STEP_IDS.includes(value as OnboardingStepId)
    ? (value as OnboardingStepId)
    : null;
}
