import { useCallback, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { useMutation, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useLocalSession } from "@/providers/localSession";
import { upsertLocalProject } from "@/lib/localProjects";
import {
  hasSpkDraftContent,
  saveSpkDraftLocally,
  saveSpkDraftToConvex,
  type SpkDraftInput,
  type SpkStep,
} from "@/lib/spkDraft";
import { useSpkDraft } from "@/providers/SpkDraftContext";

/** Avoid flush callbacks wiping persisted string fields with empty values. */
function mergeSpkFlushPatch(
  base: SpkDraftInput,
  patch: Partial<SpkDraftInput>,
): SpkDraftInput {
  const next: SpkDraftInput = { ...base };
  for (const [key, value] of Object.entries(patch) as [keyof SpkDraftInput, unknown][]) {
    if (value === undefined) continue;
    if (
      typeof value === "string" &&
      !value.trim() &&
      typeof base[key] === "string" &&
      (base[key] as string).trim()
    ) {
      continue;
    }
    (next as Record<keyof SpkDraftInput, unknown>)[key] = value;
  }
  return next;
}

type UseSpkCloseOptions = {
  step: SpkStep;
  /** When true, exit navigates home without writing a draft (e.g. after export). */
  skipPersist?: boolean;
  /** Status to write when persisting (defaults to draft). */
  persistStatus?: "draft" | "exported";
  /**
   * Fields to merge into the draft at save time (e.g. metadata release date kept in
   * local UI state). Avoids a race where setState from mergeDraft has not flushed yet.
   */
  getFlushPatch?: () => Partial<SpkDraftInput>;
};

export function useSpkClose({
  step,
  skipPersist = false,
  persistStatus = "draft",
  getFlushPatch,
}: UseSpkCloseOptions) {
  const {
    getDraftSnapshot,
    projectId,
    localProjectId,
    setProjectId,
    setLocalProjectId,
  } = useSpkDraft();
  const router = useRouter();
  const { isLocalGuest } = useLocalSession();
  const { isAuthenticated } = useConvexAuth();
  const createProject = useMutation(api.projects.create);
  const updateProject = useMutation(api.projects.update);
  const [isSaving, setIsSaving] = useState(false);
  const savePromiseRef = useRef<Promise<void> | null>(null);
  const getFlushPatchRef = useRef(getFlushPatch);
  getFlushPatchRef.current = getFlushPatch;

  const handleClose = useCallback(() => {
    if (savePromiseRef.current) {
      void savePromiseRef.current;
      return;
    }

    const run = async () => {
      if (skipPersist) {
        router.replace("/");
        return;
      }

      const flushPatch = getFlushPatchRef.current?.() ?? {};
      const draft: SpkDraftInput = {
        ...mergeSpkFlushPatch(getDraftSnapshot(step), flushPatch),
        step,
      };

      if (!hasSpkDraftContent(draft)) {
        router.replace("/");
        return;
      }

      setIsSaving(true);
      try {
        if (isLocalGuest) {
          const savedId = await saveSpkDraftLocally({
            localProjectId,
            input: draft,
            status: persistStatus,
            upsertLocalProject,
          });
          if (savedId) setLocalProjectId(savedId);
        } else if (isAuthenticated) {
          const savedId = await saveSpkDraftToConvex({
            projectId: projectId as Id<"projects"> | undefined,
            input: draft,
            status: persistStatus,
            createProject: (args) => createProject(args as never),
            updateProject: (args) => updateProject(args as never),
          });
          if (savedId) setProjectId(String(savedId));
        }
      } catch (error) {
        console.warn("Failed to save SPK draft:", error);
      } finally {
        setIsSaving(false);
        savePromiseRef.current = null;
        router.replace("/");
      }
    };

    savePromiseRef.current = run();
    void savePromiseRef.current;
  }, [
    getDraftSnapshot,
    step,
    skipPersist,
    persistStatus,
    isLocalGuest,
    isAuthenticated,
    localProjectId,
    projectId,
    createProject,
    updateProject,
    setProjectId,
    setLocalProjectId,
    router,
  ]);

  return { handleClose, isSaving };
}
