import type { Doc, Id } from "../../convex/_generated/dataModel";
import type { LocalProject, UpsertLocalProjectInput } from "@/lib/localProjects";
import { normalizeMediaUri } from "@/lib/mediaUri";

export type FlyerTemplateId = "heat" | "iridescent" | "vintage";
export type FlyerStep = "details" | "editor" | "export";
export type FlyerAspectRatio = "9:16" | "4:5";
export type FlyerExportFormat = "video" | "image";

export type FlyerLineupItem = {
  name: string;
  headliner?: boolean;
  setTime?: string | null;
};

export type FlyerLineupLayout =
  | "grid"
  | "column"
  | "festival"
  | "spotlight"
  | "single";

export type FlyerLineup = {
  items: FlyerLineupItem[];
  showSetTimes?: boolean;
  layout?: FlyerLineupLayout;
  introLabel?: string | null;
};

export type FlyerDraftInput = {
  step?: FlyerStep;
  eventName?: string;
  eventDate?: string;
  eventTime?: string;
  eventEndTime?: string;
  venue?: string;
  city?: string;
  eyebrow?: string;
  flyerSubtitle?: string;
  tagline?: string;
  photoUri?: string | null;
  photoName?: string | null;
  audioUri?: string | null;
  audioName?: string | null;
  trimStart?: number;
  trimEnd?: number;
  templateId?: FlyerTemplateId;
  aspectRatio?: FlyerAspectRatio;
  backgroundKey?: string;
  accentColor?: string;
  exportFormat?: FlyerExportFormat;
  lineupJson?: string;
  exportedVideoUri?: string | null;
};

export type FlyerRouteParams = Record<string, string | string[] | undefined>;

const FLYER_ROUTES: Record<FlyerStep, string> = {
  details: "/create/flyer/details",
  editor: "/create/flyer/editor",
  export: "/create/flyer/export",
};

export const FLYER_STEP_PATHS = FLYER_ROUTES;

export const FLYER_STEP_ORDER: FlyerStep[] = ["details", "editor", "export"];

export function getFlyerPreviousStep(step: FlyerStep): FlyerStep | null {
  const index = FLYER_STEP_ORDER.indexOf(step);
  if (index <= 0) return null;
  return FLYER_STEP_ORDER[index - 1] ?? null;
}

export function getFlyerStepLabel(step: FlyerStep): string {
  const index = FLYER_STEP_ORDER.indexOf(step);
  return `${index + 1} of ${FLYER_STEP_ORDER.length}`;
}

export function getFlyerResumeRoute(step: FlyerStep): string {
  return FLYER_ROUTES[step] ?? FLYER_ROUTES.details;
}

export function getFlyerResumeStepFromProject(project: {
  status?: "draft" | "exported";
  flyerStep?: FlyerStep;
}): FlyerStep {
  if (project.status === "exported") return "editor";
  if (project.flyerStep === "export") return "export";
  if (project.flyerStep === "editor") return "editor";
  return "details";
}

export function getFlyerProjectResumeNavigation(
  project: ConvexProject | LocalProject,
  projectKey: string,
  isLocal: boolean,
): { pathname: string; params: Record<string, string> } {
  const step = getFlyerResumeStepFromProject(project);
  return {
    pathname: getFlyerResumeRoute(step),
    params: {
      step,
      ...(isLocal
        ? { localProjectId: projectKey }
        : { projectId: projectKey }),
      isExistingProject: "1",
      fromHome: "1",
    },
  };
}

function routeParam(p: string | string[] | undefined): string {
  return Array.isArray(p) ? (p[0] ?? "") : (p ?? "");
}

export function parseFlyerRouteParams(params: FlyerRouteParams): FlyerDraftInput & {
  projectId?: string;
  localProjectId?: string;
  isExistingProject?: boolean;
  fromHome?: boolean;
} {
  const step = routeParam(params.step) as FlyerStep;
  return {
    step: step === "editor" || step === "export" ? step : "details",
    eventName: routeParam(params.eventName) || undefined,
    eventDate: routeParam(params.eventDate) || undefined,
    eventTime: routeParam(params.eventTime) || undefined,
    eventEndTime: routeParam(params.eventEndTime) || undefined,
    venue: routeParam(params.venue) || undefined,
    city: routeParam(params.city) || undefined,
    eyebrow: routeParam(params.eyebrow) || undefined,
    flyerSubtitle: routeParam(params.flyerSubtitle) || undefined,
    tagline: routeParam(params.tagline) || undefined,
    photoUri: routeParam(params.photoUri) || undefined,
    photoName: routeParam(params.photoName) || undefined,
    audioUri: routeParam(params.audioUri) || undefined,
    audioName: routeParam(params.audioName) || undefined,
    trimStart: routeParam(params.trimStart)
      ? Number(routeParam(params.trimStart))
      : undefined,
    trimEnd: routeParam(params.trimEnd)
      ? Number(routeParam(params.trimEnd))
      : undefined,
    templateId: (routeParam(params.templateId) as FlyerTemplateId) || undefined,
    aspectRatio: (routeParam(params.aspectRatio) as FlyerAspectRatio) || undefined,
    backgroundKey: routeParam(params.backgroundKey) || undefined,
    accentColor: routeParam(params.accentColor) || undefined,
    exportFormat: (routeParam(params.exportFormat) as FlyerExportFormat) || undefined,
    lineupJson: routeParam(params.lineupJson) || undefined,
    projectId: routeParam(params.projectId) || undefined,
    localProjectId: routeParam(params.localProjectId) || undefined,
    isExistingProject: routeParam(params.isExistingProject) === "1",
    fromHome: routeParam(params.fromHome) === "1",
  };
}

export function flyerDraftToRouteParams(
  draft: FlyerDraftInput,
  meta?: {
    projectId?: string;
    localProjectId?: string;
    isExistingProject?: boolean;
    fromHome?: boolean;
  },
): Record<string, string> {
  const out: Record<string, string> = {};
  const set = (key: string, value: string | number | undefined | null) => {
    if (value === undefined || value === null || value === "") return;
    out[key] = String(value);
  };

  set("step", draft.step ?? "details");
  set("eventName", draft.eventName);
  set("eventDate", draft.eventDate);
  set("eventTime", draft.eventTime);
  set("eventEndTime", draft.eventEndTime);
  set("venue", draft.venue);
  set("city", draft.city);
  set("eyebrow", draft.eyebrow);
  set("flyerSubtitle", draft.flyerSubtitle);
  set("tagline", draft.tagline);
  set("photoUri", draft.photoUri);
  set("photoName", draft.photoName);
  set("audioUri", draft.audioUri);
  set("audioName", draft.audioName);
  set("trimStart", draft.trimStart);
  set("trimEnd", draft.trimEnd);
  set("templateId", draft.templateId);
  set("aspectRatio", draft.aspectRatio);
  set("backgroundKey", draft.backgroundKey);
  set("accentColor", draft.accentColor);
  set("exportFormat", draft.exportFormat);
  set("lineupJson", draft.lineupJson);
  set("projectId", meta?.projectId);
  set("localProjectId", meta?.localProjectId);
  if (meta?.isExistingProject) out.isExistingProject = "1";
  if (meta?.fromHome) out.fromHome = "1";
  return out;
}

export function hasFlyerDraftContent(draft: FlyerDraftInput): boolean {
  return Boolean(
    draft.eventName?.trim() ||
      draft.eventDate?.trim() ||
      draft.eventTime?.trim() ||
      draft.venue?.trim() ||
      draft.photoUri ||
      draft.audioUri,
  );
}

export function parseFlyerLineup(json: string | undefined): FlyerLineup {
  if (!json?.trim()) return { items: [], showSetTimes: true };
  try {
    const parsed = JSON.parse(json) as FlyerLineup;
    if (!parsed || !Array.isArray(parsed.items)) return { items: [], showSetTimes: true };
    return parsed;
  } catch {
    return { items: [], showSetTimes: true };
  }
}

export function defaultFlyerLineup(): FlyerLineup {
  return {
    items: [
      { name: "MARLEY MAC", setTime: "4PM" },
      { name: "KIWI", setTime: "5PM" },
      { name: "SHELZ", setTime: "6PM" },
      { name: "DH(A)D", setTime: "7PM" },
    ],
    showSetTimes: true,
    introLabel: null,
  };
}

type ConvexProject = Doc<"projects">;

export function convexProjectToFlyerDraft(project: ConvexProject): FlyerDraftInput {
  return {
    step:
      project.flyerStep ??
      (project.status === "exported" ? "export" : "details"),
    eventName: project.title,
    eventDate: project.releaseDate,
    eventTime: project.eventTime,
    eventEndTime: project.eventEndTime?.trim() || undefined,
    venue: project.venue,
    city: project.city,
    eyebrow: project.flyerEyebrow,
    flyerSubtitle: project.flyerSubtitle,
    tagline: project.flyerTagline,
    photoUri: project.photoUri,
    photoName: project.photoName,
    audioUri: project.audioUri,
    audioName: project.audioName,
    trimStart: project.trimStart,
    trimEnd: project.trimEnd,
    templateId: (project.flyerTemplateId as FlyerTemplateId) ?? "heat",
    aspectRatio:
      project.aspectRatio === "4:5" ? "4:5" : "9:16",
    backgroundKey: project.flyerBackgroundKey,
    accentColor: project.flyerAccentColor,
    exportFormat: project.flyerExportFormat,
    lineupJson: project.flyerLineupJson,
    exportedVideoUri: project.exportedVideoUri,
  };
}

export function localProjectToFlyerDraft(project: LocalProject): FlyerDraftInput {
  return {
    step:
      project.flyerStep ??
      (project.status === "exported" ? "export" : "details"),
    eventName: project.title,
    eventDate: project.releaseDate,
    eventTime: project.eventTime,
    eventEndTime: project.eventEndTime?.trim() || undefined,
    venue: project.venue,
    city: project.city,
    eyebrow: project.flyerEyebrow,
    flyerSubtitle: project.flyerSubtitle,
    tagline: project.flyerTagline,
    photoUri: project.photoUri,
    photoName: project.photoName,
    audioUri: project.audioUri,
    audioName: project.audioName,
    trimStart: project.trimStart,
    trimEnd: project.trimEnd,
    templateId: (project.flyerTemplateId as FlyerTemplateId) ?? "heat",
    aspectRatio:
      project.aspectRatio === "4:5" ? "4:5" : "9:16",
    backgroundKey: project.flyerBackgroundKey,
    accentColor: project.flyerAccentColor,
    exportFormat: project.flyerExportFormat,
    lineupJson: project.flyerLineupJson,
    exportedVideoUri: project.exportedVideoUri,
  };
}

export type SaveFlyerDraftConvexArgs = {
  projectId?: Id<"projects"> | null;
  input: FlyerDraftInput;
  status?: "draft" | "exported";
  createProject: (args: object) => Promise<Id<"projects">>;
  updateProject: (args: object) => Promise<Id<"projects">>;
};

export async function saveFlyerDraftToConvex({
  projectId,
  input,
  status = "draft",
  createProject,
  updateProject,
}: SaveFlyerDraftConvexArgs): Promise<Id<"projects"> | null> {
  if (!hasFlyerDraftContent(input)) return null;

  const aspectRatio = input.aspectRatio === "4:5" ? "4:5" : "9:16";
  const payload = {
    type: "flyer" as const,
    aspectRatio,
    status,
    flyerStep: input.step,
    title: input.eventName?.trim() || undefined,
    releaseDate: input.eventDate?.trim() || undefined,
    eventTime: input.eventTime?.trim() || undefined,
    eventEndTime: input.eventEndTime?.trim() ?? "",
    venue: input.venue?.trim() || undefined,
    city: input.city?.trim() || undefined,
    photoUri: normalizeMediaUri(input.photoUri) || undefined,
    photoName: input.photoName?.trim() || undefined,
    audioUri: normalizeMediaUri(input.audioUri) || undefined,
    audioName: input.audioName?.trim() || undefined,
    trimStart:
      input.trimStart != null && Number.isFinite(input.trimStart)
        ? input.trimStart
        : undefined,
    trimEnd:
      input.trimEnd != null && Number.isFinite(input.trimEnd)
        ? input.trimEnd
        : undefined,
    flyerEyebrow: input.eyebrow?.trim() || undefined,
    flyerSubtitle: input.flyerSubtitle?.trim() || undefined,
    flyerTagline: input.tagline?.trim() || undefined,
    flyerTemplateId: input.templateId,
    flyerBackgroundKey: input.backgroundKey,
    flyerAccentColor: input.accentColor,
    flyerExportFormat: input.exportFormat,
    flyerLineupJson: input.lineupJson,
    exportedVideoUri:
      status === "exported"
        ? normalizeMediaUri(input.exportedVideoUri) || undefined
        : undefined,
  };

  if (projectId) {
    return await updateProject({ projectId, ...payload });
  }

  return await createProject(payload);
}

export type SaveFlyerDraftLocalArgs = {
  localProjectId?: string | null;
  input: FlyerDraftInput;
  status?: "draft" | "exported";
  upsertLocalProject: (args: UpsertLocalProjectInput) => Promise<LocalProject>;
};

export async function saveFlyerDraftLocally({
  localProjectId,
  input,
  status = "draft",
  upsertLocalProject,
}: SaveFlyerDraftLocalArgs): Promise<string | null> {
  if (!hasFlyerDraftContent(input)) return null;

  const aspectRatio = input.aspectRatio === "4:5" ? "4:5" : "9:16";
  const project = await upsertLocalProject({
    id: localProjectId?.trim() || undefined,
    type: "flyer",
    aspectRatio,
    status,
    flyerStep: input.step,
    title: input.eventName?.trim() || undefined,
    releaseDate: input.eventDate?.trim() || undefined,
    eventTime: input.eventTime?.trim() || undefined,
    eventEndTime: input.eventEndTime?.trim() ?? "",
    venue: input.venue?.trim() || undefined,
    city: input.city?.trim() || undefined,
    photoUri: normalizeMediaUri(input.photoUri) || undefined,
    photoName: input.photoName?.trim() || undefined,
    audioUri: normalizeMediaUri(input.audioUri) || undefined,
    audioName: input.audioName?.trim() || undefined,
    trimStart:
      input.trimStart != null && Number.isFinite(input.trimStart)
        ? input.trimStart
        : undefined,
    trimEnd:
      input.trimEnd != null && Number.isFinite(input.trimEnd)
        ? input.trimEnd
        : undefined,
    flyerEyebrow: input.eyebrow?.trim() || undefined,
    flyerSubtitle: input.flyerSubtitle?.trim() || undefined,
    flyerTagline: input.tagline?.trim() || undefined,
    flyerTemplateId: input.templateId,
    flyerBackgroundKey: input.backgroundKey,
    flyerAccentColor: input.accentColor,
    flyerExportFormat: input.exportFormat,
    flyerLineupJson: input.lineupJson,
    exportedVideoUri:
      status === "exported"
        ? normalizeMediaUri(input.exportedVideoUri) || undefined
        : undefined,
  });

  return project.id;
}
