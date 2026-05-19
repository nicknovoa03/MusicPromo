import { useCallback } from "react";
import { useRouter } from "expo-router";
import { getSpkPreviousStep, SPK_STEP_PATHS, type SpkStep } from "@/lib/spkDraft";
import { useSpkDraft } from "@/providers/SpkDraftContext";

/**
 * Back one step in the SPK wizard. When opened from the home list, navigates
 * explicitly to the previous step (router.back() would leave the flow).
 */
export function useSpkWizardBack(currentStep: SpkStep) {
  const router = useRouter();
  const { openedFromHome, getNavigationParams } = useSpkDraft();
  const previousStep = getSpkPreviousStep(currentStep);

  const canStepBack = openedFromHome
    ? previousStep !== null
    : router.canGoBack();

  const goBackOneStep = useCallback(() => {
    if (openedFromHome && previousStep) {
      router.replace({
        pathname: SPK_STEP_PATHS[previousStep] as any,
        params: getNavigationParams(previousStep),
      });
      return;
    }
    if (router.canGoBack()) {
      router.back();
    }
  }, [openedFromHome, previousStep, getNavigationParams, router]);

  return { goBackOneStep, canStepBack };
}
