import { useEffect, useRef } from "react";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { useLocalSession } from "@/providers/localSession";
import { getLocalProject } from "@/lib/localProjects";
import {
  convexProjectToFlyerDraft,
  localProjectToFlyerDraft,
  type FlyerStep,
} from "@/lib/flyerDraft";
import { useFlyerDraft } from "@/providers/FlyerDraftContext";

function routeParam(p: string | string[] | undefined): string {
  return Array.isArray(p) ? (p[0] ?? "") : (p ?? "");
}

function parseResumeStep(value: string): FlyerStep {
  if (value === "editor" || value === "export") return value;
  return "details";
}

/**
 * Loads flyer project data from local storage or Convex when resuming from home.
 * URL params only carry ids — full draft fields come from the saved project.
 */
export function useFlyerProjectHydration() {
  const params = useLocalSearchParams();
  const fromHome = routeParam(params.fromHome) === "1";
  const paramProjectId = routeParam(params.projectId);
  const paramLocalId = routeParam(params.localProjectId);
  const resumeStep = parseResumeStep(routeParam(params.step));

  const { isLocalGuest } = useLocalSession();
  const { isAuthenticated } = useConvexAuth();
  const {
    mergeDraft,
    projectId,
    localProjectId,
    setProjectId,
    setLocalProjectId,
    setIsExistingProject,
  } = useFlyerDraft();

  const savedProject = useQuery(
    api.projects.getById,
    !isLocalGuest && (paramProjectId || projectId)
      ? { projectId: (paramProjectId || projectId) as Id<"projects"> }
      : "skip",
  );

  const hydratedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!fromHome) return;

    const activeLocalId = paramLocalId || localProjectId;
    const activeProjectId = paramProjectId || projectId;
    const hydrationKey = `${activeLocalId ?? ""}:${activeProjectId ?? ""}:${resumeStep}`;

    if (!activeLocalId && !activeProjectId) return;
    if (hydratedKeyRef.current === hydrationKey) return;

    let cancelled = false;

    const applyHydratedDraft = (
      draft: ReturnType<typeof localProjectToFlyerDraft>,
      status: "draft" | "exported",
    ) => {
      if (cancelled) return;
      hydratedKeyRef.current = hydrationKey;
      setIsExistingProject(status === "exported");
      mergeDraft({
        ...draft,
        step: resumeStep,
      });
    };

    void (async () => {
      if (isLocalGuest && activeLocalId) {
        const project = await getLocalProject(activeLocalId);
        if (!project || project.type !== "flyer") return;
        if (activeLocalId !== localProjectId) setLocalProjectId(activeLocalId);
        applyHydratedDraft(localProjectToFlyerDraft(project), project.status);
        return;
      }

      if (
        isAuthenticated &&
        savedProject &&
        savedProject.type === "flyer"
      ) {
        if (activeProjectId && activeProjectId !== projectId) {
          setProjectId(activeProjectId);
        }
        applyHydratedDraft(
          convexProjectToFlyerDraft(savedProject),
          savedProject.status,
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    fromHome,
    paramLocalId,
    paramProjectId,
    resumeStep,
    isLocalGuest,
    isAuthenticated,
    localProjectId,
    projectId,
    savedProject,
    mergeDraft,
    setIsExistingProject,
    setLocalProjectId,
    setProjectId,
  ]);
}
