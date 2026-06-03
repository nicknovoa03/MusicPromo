import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  parseFlyerRouteParams,
  flyerDraftToRouteParams,
  type FlyerDraftInput,
  type FlyerRouteParams,
  type FlyerStep,
} from "@/lib/flyerDraft";

type FlyerDraftContextValue = {
  draft: FlyerDraftInput;
  projectId: string | null;
  localProjectId: string | null;
  isExistingProject: boolean;
  openedFromHome: boolean;
  mergeDraft: (patch: Partial<FlyerDraftInput>) => void;
  mergeFromRouteParams: (params: FlyerRouteParams) => void;
  setProjectId: (id: string | null) => void;
  setLocalProjectId: (id: string | null) => void;
  setIsExistingProject: (value: boolean) => void;
  setOpenedFromHome: (value: boolean) => void;
  getDraftSnapshot: (step: FlyerStep) => FlyerDraftInput;
  getNavigationParams: (step: FlyerStep) => Record<string, string>;
};

const FlyerDraftContext = createContext<FlyerDraftContextValue | null>(null);

const EMPTY_DRAFT: FlyerDraftInput = {
  step: "details",
  templateId: "heat",
  aspectRatio: "9:16",
  backgroundKey: "heat-default",
  accentColor: "#FFD936",
  exportFormat: "image",
};

export function FlyerDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<FlyerDraftInput>(EMPTY_DRAFT);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [localProjectId, setLocalProjectId] = useState<string | null>(null);
  const [isExistingProject, setIsExistingProject] = useState(false);
  const [openedFromHome, setOpenedFromHome] = useState(false);

  const mergeDraft = useCallback((patch: Partial<FlyerDraftInput>) => {
    setDraft((prev) => {
      const keys = Object.keys(patch) as (keyof FlyerDraftInput)[];
      if (keys.length === 0) return prev;
      const hasChange = keys.some((key) => prev[key] !== patch[key]);
      if (!hasChange) return prev;
      return { ...prev, ...patch };
    });
  }, []);

  const mergeFromRouteParams = useCallback((params: FlyerRouteParams) => {
    const parsed = parseFlyerRouteParams(params);
    const {
      projectId: nextProjectId,
      localProjectId: nextLocalProjectId,
      isExistingProject: nextIsExisting,
      fromHome: nextFromHome,
      ...draftFields
    } = parsed;

    if (Object.keys(draftFields).length > 0) {
      setDraft((prev) => {
        const patch: Partial<FlyerDraftInput> = {};
        for (const [key, value] of Object.entries(draftFields) as [
          keyof FlyerDraftInput,
          unknown,
        ][]) {
          if (value === undefined || value === null) continue;
          if (typeof value === "string" && !value.trim()) continue;
          patch[key] = value as FlyerDraftInput[typeof key];
        }
        const keys = Object.keys(patch) as (keyof FlyerDraftInput)[];
        if (keys.length === 0) return prev;
        const hasChange = keys.some((key) => prev[key] !== patch[key]);
        if (!hasChange) return prev;
        return { ...prev, ...patch };
      });
    }
    if (nextProjectId) setProjectId((prev) => (prev === nextProjectId ? prev : nextProjectId));
    if (nextLocalProjectId) {
      setLocalProjectId((prev) =>
        prev === nextLocalProjectId ? prev : nextLocalProjectId,
      );
    }
    if (nextIsExisting !== undefined) {
      setIsExistingProject((prev) => (prev === nextIsExisting ? prev : nextIsExisting));
    }
    if (nextFromHome !== undefined) {
      setOpenedFromHome((prev) => (prev === nextFromHome ? prev : nextFromHome));
    }
  }, []);

  const getDraftSnapshot = useCallback(
    (step: FlyerStep): FlyerDraftInput => ({
      ...draft,
      step,
    }),
    [draft],
  );

  const getNavigationParams = useCallback(
    (step: FlyerStep) =>
      flyerDraftToRouteParams(getDraftSnapshot(step), {
        projectId: projectId ?? undefined,
        localProjectId: localProjectId ?? undefined,
        isExistingProject,
        fromHome: openedFromHome,
      }),
    [
      getDraftSnapshot,
      projectId,
      localProjectId,
      isExistingProject,
      openedFromHome,
    ],
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
    <FlyerDraftContext.Provider value={value}>
      {children}
    </FlyerDraftContext.Provider>
  );
}

export function useFlyerDraft() {
  const ctx = useContext(FlyerDraftContext);
  if (!ctx) {
    throw new Error("useFlyerDraft must be used within FlyerDraftProvider");
  }
  return ctx;
}
