import { useCallback } from "react";
import { useRouter } from "expo-router";
import {
  FLYER_STEP_PATHS,
  getFlyerPreviousStep,
  type FlyerStep,
} from "@/lib/flyerDraft";
import { useFlyerDraft } from "@/providers/FlyerDraftContext";

/**
 * Back one step in the flyer wizard. When opened from home, navigates explicitly
 * to the previous step (router.back() would leave the flow).
 */
export function useFlyerWizardBack(currentStep: FlyerStep) {
  const router = useRouter();
  const { openedFromHome, getNavigationParams } = useFlyerDraft();
  const previousStep = getFlyerPreviousStep(currentStep);

  const canStepBack = openedFromHome
    ? previousStep !== null
    : router.canGoBack();

  const goBackOneStep = useCallback(() => {
    if (openedFromHome && previousStep) {
      router.replace({
        pathname: FLYER_STEP_PATHS[previousStep] as any,
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
