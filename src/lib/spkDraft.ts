import type { Id } from "../../convex/_generated/dataModel";
import { decodeTextParam, decodeUriParam, encodeTextParam, encodeUriParam } from "@/lib/uri";
import { normalizeMediaUri } from "@/lib/mediaUri";
import { normalizeSpkReleaseDateStored } from "@/lib/spkReleaseDate";
import type { LocalProject, UpsertLocalProjectInput } from "@/lib/localProjects";
import type { Doc } from "../../convex/_generated/dataModel";

export type SpkStep = "details" | "vision" | "metadata" | "preview";

export type SpkDraftInput = {
  step: SpkStep;
  artistName?: string;
  photoUri?: string | null;
  photoName?: string | null;
  title?: string;
  linkedProjectId?: string | null;
  templateName?: string | null;
  clipDurationSec?: number | null;
  vision?: string;
  genre?: string;
  bpm?: string;
  releaseDate?: string;
  label?: string;
  collaborators?: string;
  themeColor?: string;
  customCoverUri?: string | null;
  innerBackgroundUri?: string | null;
};

export type SpkProjectRecord = Pick<
  Doc<"projects">,
  | "_id"
  | "status"
  | "title"
  | "photoUri"
  | "photoName"
  | "vision"
  | "genre"
  | "bpm"
  | "releaseDate"
  | "label"
  | "collaborators"
  | "themeColor"
  | "customCoverUri"
  | "innerBackgroundUri"
  | "artistName"
  | "linkedProjectId"
  | "templateName"
  | "clipDurationSec"
  | "spkStep"
> & {
  type?: "video" | "spk";
};

export type SpkLocalProjectRecord = Omit<LocalProject, "type"> & {
  type?: "video" | "spk";
  vision?: string;
  genre?: string;
  bpm?: string;
  releaseDate?: string;
  label?: string;
  collaborators?: string;
  themeColor?: string;
  customCoverUri?: string;
  innerBackgroundUri?: string;
  artistName?: string;
  linkedProjectId?: string;
  templateName?: string;
  clipDurationSec?: number;
  spkStep?: SpkStep;
};

const SPK_STEP_ORDER: SpkStep[] = ["details", "vision", "metadata", "preview"];

export const SPK_STEP_PATHS: Record<SpkStep, string> = {
  details: "/create/spk/details",
  vision: "/create/spk/vision",
  metadata: "/create/spk/metadata",
  preview: "/create/spk/preview",
};

export function getSpkPreviousStep(step: SpkStep): SpkStep | null {
  const index = SPK_STEP_ORDER.indexOf(step);
  if (index <= 0) return null;
  return SPK_STEP_ORDER[index - 1] ?? null;
}

export type SpkRouteParams = Record<string, string | string[] | undefined>;

function routeParam(p: string | string[] | undefined): string {
  return Array.isArray(p) ? (p[0] ?? "") : (p ?? "");
}

export type ParsedSpkRouteParams = Partial<SpkDraftInput> & {
  projectId?: string;
  localProjectId?: string;
  isExistingProject?: boolean;
  fromHome?: boolean;
};

/** Parse route params into draft patches — only non-empty values (avoids wiping context on back). */
export function parseSpkRouteParams(params: SpkRouteParams): ParsedSpkRouteParams {
  const result: ParsedSpkRouteParams = {};

  const artistName = decodeTextParam(routeParam(params.artistName));
  if (artistName) result.artistName = artistName;

  const photoUriRaw = routeParam(params.photoUri);
  if (photoUriRaw) {
    result.photoUri = normalizeMediaUri(decodeUriParam(photoUriRaw));
  }

  const photoName = routeParam(params.photoName);
  if (photoName) result.photoName = photoName;

  const title = decodeTextParam(routeParam(params.title));
  if (title) result.title = title;

  if (params.linkedProjectId !== undefined) {
    const linked = routeParam(params.linkedProjectId);
    result.linkedProjectId = linked || null;
  }

  const templateName = routeParam(params.templateName);
  if (templateName) result.templateName = templateName;

  const clipRaw = routeParam(params.clipDurationSec);
  if (clipRaw) {
    const clipParsed = Number(clipRaw);
    if (Number.isFinite(clipParsed)) result.clipDurationSec = clipParsed;
  }

  const vision = decodeTextParam(routeParam(params.vision));
  if (vision) result.vision = vision;

  const genre = decodeTextParam(routeParam(params.genre));
  if (genre) result.genre = genre;

  const bpm = decodeTextParam(routeParam(params.bpm));
  if (bpm) result.bpm = bpm;

  const releaseDate = decodeTextParam(routeParam(params.releaseDate));
  if (releaseDate) result.releaseDate = releaseDate;

  const label = decodeTextParam(routeParam(params.label));
  if (label) result.label = label;

  const collaborators = decodeTextParam(routeParam(params.collaborators));
  if (collaborators) result.collaborators = collaborators;

  const themeColor = routeParam(params.themeColor);
  if (themeColor) result.themeColor = themeColor;

  const customCoverUriRaw = routeParam(params.customCoverUri);
  if (customCoverUriRaw) {
    result.customCoverUri = normalizeMediaUri(decodeUriParam(customCoverUriRaw));
  }

  const innerBackgroundUriRaw = routeParam(params.innerBackgroundUri);
  if (innerBackgroundUriRaw) {
    result.innerBackgroundUri = normalizeMediaUri(decodeUriParam(innerBackgroundUriRaw));
  }

  const projectId = routeParam(params.projectId);
  if (projectId) result.projectId = projectId;

  const localProjectId = routeParam(params.localProjectId);
  if (localProjectId) result.localProjectId = localProjectId;

  if (params.isExistingProject !== undefined) {
    result.isExistingProject = routeParam(params.isExistingProject) === "1";
  }

  if (params.fromHome !== undefined) {
    result.fromHome = routeParam(params.fromHome) === "1";
  }

  return result;
}

export function hasSpkDraftContent(input: SpkDraftInput): boolean {
  return Boolean(
    input.photoUri?.trim() ||
      input.title?.trim() ||
      input.vision?.trim() ||
      input.artistName?.trim() ||
      input.genre?.trim() ||
      input.bpm?.trim() ||
      input.releaseDate?.trim() ||
      input.label?.trim() ||
      input.collaborators?.trim(),
  );
}

export function spkDraftToRouteParams(
  input: SpkDraftInput,
  options?: {
    projectId?: string;
    localProjectId?: string;
    isExistingProject?: boolean;
    /** Opened from project list — no in-flow previous step to return to. */
    fromHome?: boolean;
  },
): Record<string, string> {
  const photoUri = normalizeMediaUri(input.photoUri) ?? "";
  const customCoverUri = normalizeMediaUri(input.customCoverUri) ?? "";
  const innerBackgroundUri = normalizeMediaUri(input.innerBackgroundUri) ?? "";

  const params: Record<string, string> = {
    artistName: encodeTextParam(input.artistName?.trim() ?? ""),
    photoUri: encodeUriParam(photoUri),
    photoName: input.photoName?.trim() ?? "",
    title: encodeTextParam(input.title?.trim() ?? ""),
    linkedProjectId: input.linkedProjectId?.trim() ?? "",
    templateName: input.templateName?.trim() ?? "",
    clipDurationSec:
      input.clipDurationSec != null && Number.isFinite(input.clipDurationSec)
        ? String(input.clipDurationSec)
        : "",
    vision: encodeTextParam(input.vision?.trim() ?? ""),
    genre: encodeTextParam(input.genre?.trim() ?? ""),
    bpm: encodeTextParam(input.bpm?.trim() ?? ""),
    releaseDate: encodeTextParam(input.releaseDate?.trim() ?? ""),
    label: encodeTextParam(input.label?.trim() ?? ""),
    collaborators: encodeTextParam(input.collaborators?.trim() ?? ""),
    themeColor: input.themeColor?.trim() ?? "",
    customCoverUri: encodeUriParam(customCoverUri),
    innerBackgroundUri: encodeUriParam(innerBackgroundUri),
  };

  if (options?.projectId) {
    params.projectId = options.projectId;
    params.isExistingProject = options.isExistingProject ? "1" : "0";
  }
  if (options?.localProjectId) {
    params.localProjectId = options.localProjectId;
  }
  if (options?.fromHome) {
    params.fromHome = "1";
  }

  return params;
}

export function convexProjectToSpkDraft(project: SpkProjectRecord): SpkDraftInput {
  return {
    step: project.spkStep ?? (project.status === "exported" ? "preview" : "details"),
    artistName: project.artistName ?? "",
    photoUri: project.photoUri ?? null,
    photoName: project.photoName ?? null,
    title: project.title ?? "",
    linkedProjectId: project.linkedProjectId ?? null,
    templateName: project.templateName ?? null,
    clipDurationSec: project.clipDurationSec ?? null,
    vision: project.vision ?? "",
    genre: project.genre ?? "",
    bpm: project.bpm ?? "",
    releaseDate: project.releaseDate ?? "",
    label: project.label ?? "",
    collaborators: project.collaborators ?? "",
    themeColor: project.themeColor ?? "",
    customCoverUri: project.customCoverUri ?? null,
    innerBackgroundUri: project.innerBackgroundUri ?? null,
  };
}

export function localProjectToSpkDraft(project: SpkLocalProjectRecord): SpkDraftInput {
  return {
    step: project.spkStep ?? (project.status === "exported" ? "preview" : "details"),
    artistName: project.artistName ?? "",
    photoUri: project.photoUri ?? null,
    photoName: project.photoName ?? null,
    title: project.title ?? "",
    linkedProjectId: project.linkedProjectId ?? null,
    templateName: project.templateName ?? null,
    clipDurationSec: project.clipDurationSec ?? null,
    vision: project.vision ?? "",
    genre: project.genre ?? "",
    bpm: project.bpm ?? "",
    releaseDate: project.releaseDate ?? "",
    label: project.label ?? "",
    collaborators: project.collaborators ?? "",
    themeColor: project.themeColor ?? "",
    customCoverUri: project.customCoverUri ?? null,
    innerBackgroundUri: project.innerBackgroundUri ?? null,
  };
}

export function getSpkResumeRoute(
  project: SpkProjectRecord | SpkLocalProjectRecord,
  projectKey: string,
  isLocal: boolean,
): { pathname: string; params: Record<string, string> } {
  const draft = isLocal
    ? localProjectToSpkDraft(project as SpkLocalProjectRecord)
    : convexProjectToSpkDraft(project as SpkProjectRecord);
  const step =
    project.status === "exported"
      ? "preview"
      : draft.step;
  const pathname = SPK_STEP_PATHS[step];

  return {
    pathname,
    params: spkDraftToRouteParams(draft, {
      projectId: isLocal ? undefined : projectKey,
      localProjectId: isLocal ? projectKey : undefined,
      isExistingProject: project.status === "exported",
      fromHome: true,
    }),
  };
}

export type SaveSpkDraftConvexArgs = {
  projectId?: Id<"projects"> | null;
  input: SpkDraftInput;
  status?: "draft" | "exported";
  createProject: (args: object) => Promise<Id<"projects">>;
  updateProject: (args: object) => Promise<Id<"projects">>;
};

export async function saveSpkDraftToConvex({
  projectId,
  input,
  status = "draft",
  createProject,
  updateProject,
}: SaveSpkDraftConvexArgs): Promise<Id<"projects"> | null> {
  if (!hasSpkDraftContent(input)) return null;

  const payload = {
    type: "spk" as const,
    aspectRatio: "4:5" as const,
    status,
    spkStep: input.step,
    title: input.title?.trim() || undefined,
    photoUri: normalizeMediaUri(input.photoUri) || undefined,
    photoName: input.photoName?.trim() || undefined,
    vision: input.vision?.trim() || undefined,
    genre: input.genre?.trim() || undefined,
    bpm: input.bpm?.trim() || undefined,
    releaseDate: normalizeSpkReleaseDateStored(input.releaseDate) || undefined,
    label: input.label?.trim() || undefined,
    collaborators: input.collaborators?.trim() || undefined,
    themeColor: input.themeColor?.trim() || undefined,
    customCoverUri: normalizeMediaUri(input.customCoverUri) || undefined,
    innerBackgroundUri: normalizeMediaUri(input.innerBackgroundUri) || undefined,
    artistName: input.artistName?.trim() || undefined,
    linkedProjectId: input.linkedProjectId?.trim() || undefined,
    templateName: input.templateName?.trim() || undefined,
    clipDurationSec:
      input.clipDurationSec != null && Number.isFinite(input.clipDurationSec)
        ? input.clipDurationSec
        : undefined,
  };

  if (projectId) {
    return await updateProject({ projectId, ...payload });
  }

  return await createProject(payload);
}

export type SaveSpkDraftLocalArgs = {
  localProjectId?: string | null;
  input: SpkDraftInput;
  status?: "draft" | "exported";
  upsertLocalProject: (args: UpsertLocalProjectInput) => Promise<LocalProject>;
};

export async function saveSpkDraftLocally({
  localProjectId,
  input,
  status = "draft",
  upsertLocalProject,
}: SaveSpkDraftLocalArgs): Promise<string | null> {
  if (!hasSpkDraftContent(input)) return null;

  const project = await upsertLocalProject({
    id: localProjectId?.trim() || undefined,
    type: "spk",
    aspectRatio: "4:5",
    status,
    spkStep: input.step,
    title: input.title?.trim() || undefined,
    photoUri: normalizeMediaUri(input.photoUri) || undefined,
    photoName: input.photoName?.trim() || undefined,
    vision: input.vision?.trim() || undefined,
    genre: input.genre?.trim() || undefined,
    bpm: input.bpm?.trim() || undefined,
    releaseDate: normalizeSpkReleaseDateStored(input.releaseDate) || undefined,
    label: input.label?.trim() || undefined,
    collaborators: input.collaborators?.trim() || undefined,
    themeColor: input.themeColor?.trim() || undefined,
    customCoverUri: normalizeMediaUri(input.customCoverUri) || undefined,
    innerBackgroundUri: normalizeMediaUri(input.innerBackgroundUri) || undefined,
    artistName: input.artistName?.trim() || undefined,
    linkedProjectId: input.linkedProjectId?.trim() || undefined,
    templateName: input.templateName?.trim() || undefined,
    clipDurationSec:
      input.clipDurationSec != null && Number.isFinite(input.clipDurationSec)
        ? input.clipDurationSec
        : undefined,
  });

  return project.id;
}
