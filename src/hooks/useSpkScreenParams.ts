import { useCallback, useMemo, useRef } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSpkDraft } from "@/providers/SpkDraftContext";
import type { SpkStep } from "@/lib/spkDraft";

function routeParam(p: string | string[] | undefined): string {
  return Array.isArray(p) ? (p[0] ?? "") : (p ?? "");
}

/**
 * Updates the current wizard step on focus. Hydrates from URL only when resuming
 * from home or when the project id in the URL changes — not on in-flow back navigation.
 */
export function useSpkScreenParams(step: SpkStep) {
  const params = useLocalSearchParams();
  const {
    draft,
    mergeFromRouteParams,
    mergeDraft,
    projectId,
    localProjectId,
    openedFromHome,
    setOpenedFromHome,
  } = useSpkDraft();

  const fromHome = routeParam(params.fromHome) === "1";
  const paramProjectId = routeParam(params.projectId);
  const paramLocalId = routeParam(params.localProjectId);

  const hydrationKey = useMemo(
    () => `${fromHome ? "1" : "0"}:${paramProjectId}:${paramLocalId}`,
    [fromHome, paramProjectId, paramLocalId],
  );

  const lastHydrationKeyRef = useRef<string | null>(null);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  useFocusEffect(
    useCallback(() => {
      if (draft.step !== step) {
        mergeDraft({ step });
      }

      const needsHydration =
        fromHome ||
        (paramProjectId.length > 0 && paramProjectId !== projectId) ||
        (paramLocalId.length > 0 && paramLocalId !== localProjectId);

      if (!needsHydration || lastHydrationKeyRef.current === hydrationKey) {
        return;
      }

      lastHydrationKeyRef.current = hydrationKey;

      if (fromHome && !openedFromHome) {
        setOpenedFromHome(true);
      }
      mergeFromRouteParams(paramsRef.current);
    }, [
      draft.step,
      mergeFromRouteParams,
      mergeDraft,
      setOpenedFromHome,
      openedFromHome,
      step,
      fromHome,
      paramProjectId,
      paramLocalId,
      projectId,
      localProjectId,
      hydrationKey,
    ]),
  );

  return params;
}
