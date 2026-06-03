import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  parseSpkRouteParams,
  spkDraftToRouteParams,
  type SpkDraftInput,
  type SpkRouteParams,
  type SpkStep,
} from "@/lib/spkDraft";

type SpkDraftContextValue = {
  draft: SpkDraftInput;
  projectId: string | null;
  localProjectId: string | null;
  isExistingProject: boolean;
  openedFromHome: boolean;
  mergeDraft: (patch: Partial<SpkDraftInput>) => void;
  mergeFromRouteParams: (params: SpkRouteParams) => void;
  setProjectId: (id: string | null) => void;
  setLocalProjectId: (id: string | null) => void;
  setIsExistingProject: (value: boolean) => void;
  setOpenedFromHome: (value: boolean) => void;
  getDraftSnapshot: (step: SpkStep) => SpkDraftInput;
  getNavigationParams: (step: SpkStep) => Record<string, string>;
};

const SpkDraftContext = createContext<SpkDraftContextValue | null>(null);

const EMPTY_DRAFT: SpkDraftInput = {
  step: "details",
};

export function SpkDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<SpkDraftInput>(EMPTY_DRAFT);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [localProjectId, setLocalProjectId] = useState<string | null>(null);
  const [isExistingProject, setIsExistingProject] = useState(false);
  const [openedFromHome, setOpenedFromHome] = useState(false);

  const mergeDraft = useCallback((patch: Partial<SpkDraftInput>) => {
    setDraft((prev) => {
      const keys = Object.keys(patch) as (keyof SpkDraftInput)[];
      if (keys.length === 0) return prev;
      const hasChange = keys.some((key) => prev[key] !== patch[key]);
      if (!hasChange) return prev;
      return { ...prev, ...patch };
    });
  }, []);

  const mergeFromRouteParams = useCallback((params: SpkRouteParams) => {
    const parsed = parseSpkRouteParams(params);
    const {
      projectId: nextProjectId,
      localProjectId: nextLocalProjectId,
      isExistingProject: nextIsExisting,
      fromHome: nextFromHome,
      ...draftFields
    } = parsed;

    if (Object.keys(draftFields).length > 0) {
      setDraft((prev) => ({ ...prev, ...draftFields }));
    }
    if (nextProjectId) setProjectId(nextProjectId);
    if (nextLocalProjectId) setLocalProjectId(nextLocalProjectId);
    if (nextIsExisting !== undefined) {
      setIsExistingProject(nextIsExisting);
    }
    if (nextFromHome !== undefined) {
      setOpenedFromHome(nextFromHome);
    }
  }, []);

  const getDraftSnapshot = useCallback(
    (step: SpkStep): SpkDraftInput => ({
      ...draft,
      step,
    }),
    [draft],
  );

  const getNavigationParams = useCallback(
    (step: SpkStep) =>
      spkDraftToRouteParams(getDraftSnapshot(step), {
        projectId: projectId ?? undefined,
        localProjectId: localProjectId ?? undefined,
        isExistingProject,
        fromHome: openedFromHome,
      }),
    [getDraftSnapshot, projectId, localProjectId, isExistingProject, openedFromHome],
  );

  const value = useMemo(
    () => ({
      draft,
      projectId,
      localProjectId,
      isExistingProject,
      openedFromHome,
      mergeDraft,
      mergeFromRouteParams,
      setProjectId,
      setLocalProjectId,
      setIsExistingProject,
      setOpenedFromHome,
      getDraftSnapshot,
      getNavigationParams,
    }),
    [
      draft,
      projectId,
      localProjectId,
      isExistingProject,
      openedFromHome,
      mergeDraft,
      mergeFromRouteParams,
      getDraftSnapshot,
      getNavigationParams,
    ],
  );

  return (
    <SpkDraftContext.Provider value={value}>{children}</SpkDraftContext.Provider>
  );
}

export function useSpkDraft() {
  const ctx = useContext(SpkDraftContext);
  if (!ctx) {
    throw new Error("useSpkDraft must be used within SpkDraftProvider");
  }
  return ctx;
}
