import { useCallback, useRef, useState } from "react";
import { Platform } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useLocalSession } from "@/providers/localSession";
import { upsertLocalProject } from "@/lib/localProjects";
import {
  hasFlyerDraftContent,
  saveFlyerDraftLocally,
  saveFlyerDraftToConvex,
  type FlyerDraftInput,
  type FlyerStep,
} from "@/lib/flyerDraft";
import { useFlyerDraft } from "@/providers/FlyerDraftContext";

function mergeFlyerFlushPatch(
  base: FlyerDraftInput,
  patch: Partial<FlyerDraftInput>,
): FlyerDraftInput {
  const next: FlyerDraftInput = { ...base };
  for (const [key, value] of Object.entries(patch) as [keyof FlyerDraftInput, unknown][]) {
    if (value === undefined) continue;
    if (
      typeof value === "string" &&
      !value.trim() &&
      typeof base[key] === "string" &&
      (base[key] as string).trim()
    ) {
      continue;
    }
    (next as Record<keyof FlyerDraftInput, unknown>)[key] = value;
  }
  return next;
}

type UseFlyerCloseOptions = {
  step: FlyerStep;
  skipPersist?: boolean;
  persistStatus?: "draft" | "exported";
  getFlushPatch?: () => Partial<FlyerDraftInput>;
  /** When set, navigate here instead of home after save. */
  onAfterSave?: () => void;
};

export function useFlyerClose({
  step,
  skipPersist = false,
  persistStatus = "draft",
  getFlushPatch,
  onAfterSave,
}: UseFlyerCloseOptions) {
  const {
    getDraftSnapshot,
    projectId,
    localProjectId,
    setProjectId,
    setLocalProjectId,
  } = useFlyerDraft();
  const router = useRouter();
  const { isLocalGuest } = useLocalSession();
  const { isAuthenticated } = useConvexAuth();
  const createProject = useMutation(api.projects.create);
  const updateProject = useMutation(api.projects.update);
  const [isSaving, setIsSaving] = useState(false);
  const savePromiseRef = useRef<Promise<void> | null>(null);
  const getFlushPatchRef = useRef(getFlushPatch);
  getFlushPatchRef.current = getFlushPatch;

  const persistDraft = useCallback(
    async (
      extraPatch?: Partial<FlyerDraftInput>,
      statusOverride?: "draft" | "exported",
    ): Promise<boolean> => {
    const flushPatch = getFlushPatchRef.current?.() ?? {};
    const draft: FlyerDraftInput = {
      ...mergeFlyerFlushPatch(getDraftSnapshot(step), {
        ...flushPatch,
        ...extraPatch,
      }),
      step: extraPatch?.step ?? flushPatch.step ?? step,
    };

    if (!hasFlyerDraftContent(draft)) return false;

    const status = statusOverride ?? persistStatus;

    if (isLocalGuest) {
      const savedId = await saveFlyerDraftLocally({
        localProjectId,
        input: draft,
        status,
        upsertLocalProject,
      });
      if (savedId) setLocalProjectId(savedId);
    } else if (isAuthenticated) {
      const savedId = await saveFlyerDraftToConvex({
        projectId: projectId as Id<"projects"> | undefined,
        input: draft,
        status,
        createProject: (args) => createProject(args as never),
        updateProject: (args) => updateProject(args as never),
      });
      if (savedId) setProjectId(String(savedId));
    }
    return true;
  }, [
    getDraftSnapshot,
    step,
    persistStatus,
    isLocalGuest,
    isAuthenticated,
    localProjectId,
    projectId,
    createProject,
    updateProject,
    setProjectId,
    setLocalProjectId,
  ]);

  const handleClose = useCallback(() => {
    if (savePromiseRef.current) {
      void savePromiseRef.current;
      return;
    }

    const run = async () => {
      if (skipPersist) {
        if (onAfterSave) onAfterSave();
        else if (Platform.OS !== "web") router.replace("/");
        return;
      }

      setIsSaving(true);
      try {
        await persistDraft();
      } catch (error) {
        console.warn("Failed to save flyer draft:", error);
      } finally {
        setIsSaving(false);
        savePromiseRef.current = null;
        if (onAfterSave) onAfterSave();
        else if (Platform.OS !== "web") router.replace("/");
      }
    };

    savePromiseRef.current = run();
    void savePromiseRef.current;
  }, [skipPersist, persistDraft, onAfterSave, router]);

  const saveAndContinue = useCallback(
    async (extraPatch?: Partial<FlyerDraftInput>) => {
    setIsSaving(true);
    try {
      await persistDraft(extraPatch);
      return true;
    } catch (error) {
      console.warn("Failed to save flyer draft:", error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [persistDraft]);

  return { handleClose, saveAndContinue, isSaving, persistDraft };
}
