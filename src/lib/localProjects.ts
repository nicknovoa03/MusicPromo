import AsyncStorage from "@react-native-async-storage/async-storage";
import { normalizeOptionalMediaUri } from "@/lib/mediaUri";
import type { SpkStep } from "@/lib/spkDraft";

const LOCAL_PROJECTS_KEY = "musicpromo:local-projects";

type LocalProjectStatus = "draft" | "exported";
type LocalProjectAspectRatio = "9:16" | "4:5" | "1:1";
type LocalProjectType = "video" | "spk";

export function isLocalProject(project: object): project is LocalProject {
  return typeof (project as LocalProject).id === "string";
}

export type LocalProject = {
  id: string;
  type?: LocalProjectType;
  title?: string;
  templateId?: string;
  templateTweaks?: string;
  aspectRatio: LocalProjectAspectRatio;
  photoUri?: string;
  photoName?: string;
  audioUri?: string;
  audioName?: string;
  exportedVideoUri?: string;
  trimStart?: number;
  trimEnd?: number;
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
  status: LocalProjectStatus;
  createdAt: number;
  updatedAt: number;
};

export type UpsertLocalProjectInput = {
  id?: string;
  type?: LocalProjectType;
  title?: string;
  templateId?: string;
  templateTweaks?: string;
  aspectRatio: LocalProjectAspectRatio;
  photoUri?: string;
  photoName?: string;
  audioUri?: string;
  audioName?: string;
  exportedVideoUri?: string;
  trimStart?: number;
  trimEnd?: number;
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
  status?: LocalProjectStatus;
};

function normalizeAspectRatio(value: unknown): LocalProjectAspectRatio {
  if (value === "1:1") return "1:1";
  if (value === "4:5") return "4:5";
  return "9:16";
}

function normalizeStatus(value: unknown): LocalProjectStatus {
  return value === "exported" ? "exported" : "draft";
}

function normalizeNumber(value: unknown): number | undefined {
  if (!Number.isFinite(value)) return undefined;
  return Number(value);
}

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeProject(value: unknown): LocalProject | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const id = asTrimmedString(input.id);
  const createdAt = normalizeNumber(input.createdAt);
  const updatedAt = normalizeNumber(input.updatedAt);
  if (!id || !createdAt || !updatedAt) return null;

  const type =
    input.type === "spk" || input.type === "video" ? input.type : undefined;

  return {
    id,
    type,
    title: asTrimmedString(input.title),
    templateId: asTrimmedString(input.templateId),
    templateTweaks: asTrimmedString(input.templateTweaks),
    aspectRatio: normalizeAspectRatio(input.aspectRatio),
    photoUri: normalizeOptionalMediaUri(asTrimmedString(input.photoUri)),
    photoName: asTrimmedString(input.photoName),
    audioUri: normalizeOptionalMediaUri(asTrimmedString(input.audioUri)),
    audioName: asTrimmedString(input.audioName),
    exportedVideoUri: normalizeOptionalMediaUri(
      asTrimmedString(input.exportedVideoUri),
    ),
    trimStart: normalizeNumber(input.trimStart),
    trimEnd: normalizeNumber(input.trimEnd),
    vision: asTrimmedString(input.vision),
    genre: asTrimmedString(input.genre),
    bpm: asTrimmedString(input.bpm),
    releaseDate: asTrimmedString(input.releaseDate),
    label: asTrimmedString(input.label),
    collaborators: asTrimmedString(input.collaborators),
    themeColor: asTrimmedString(input.themeColor),
    customCoverUri: normalizeOptionalMediaUri(asTrimmedString(input.customCoverUri)),
    innerBackgroundUri: normalizeOptionalMediaUri(
      asTrimmedString(input.innerBackgroundUri),
    ),
    artistName: asTrimmedString(input.artistName),
    linkedProjectId: asTrimmedString(input.linkedProjectId),
    templateName: asTrimmedString(input.templateName),
    clipDurationSec: normalizeNumber(input.clipDurationSec),
    spkStep:
      input.spkStep === "details" ||
      input.spkStep === "vision" ||
      input.spkStep === "metadata" ||
      input.spkStep === "preview"
        ? input.spkStep
        : undefined,
    status: normalizeStatus(input.status),
    createdAt,
    updatedAt,
  };
}

function sortProjectsByUpdatedAt(projects: LocalProject[]): LocalProject[] {
  return [...projects].sort((a, b) => b.updatedAt - a.updatedAt);
}

async function readProjects(): Promise<LocalProject[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_PROJECTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortProjectsByUpdatedAt(
      parsed
        .map((item) => normalizeProject(item))
        .filter((item): item is LocalProject => item !== null),
    );
  } catch (error) {
    console.warn("Failed to read local projects:", error);
    return [];
  }
}

async function writeProjects(projects: LocalProject[]): Promise<void> {
  try {
    const sorted = sortProjectsByUpdatedAt(projects);
    await AsyncStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(sorted));
  } catch (error) {
    console.warn("Failed to write local projects:", error);
  }
}

function createLocalProjectId() {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `local-${Date.now()}-${suffix}`;
}

export async function listLocalProjects(): Promise<LocalProject[]> {
  return await readProjects();
}

export async function getLocalProject(projectId: string): Promise<LocalProject | null> {
  const id = projectId.trim();
  if (!id) return null;
  const projects = await readProjects();
  return projects.find((project) => project.id === id) ?? null;
}

export async function upsertLocalProject(
  input: UpsertLocalProjectInput,
): Promise<LocalProject> {
  const projects = await readProjects();
  const now = Date.now();
  const id = input.id?.trim() || createLocalProjectId();
  const existing = projects.find((project) => project.id === id);

  const next: LocalProject = {
    id,
    type: input.type ?? existing?.type,
    title: input.title?.trim() || existing?.title,
    templateId: input.templateId?.trim() || existing?.templateId,
    templateTweaks:
      input.templateTweaks?.trim() || existing?.templateTweaks,
    aspectRatio: normalizeAspectRatio(input.aspectRatio),
    photoUri: normalizeOptionalMediaUri(input.photoUri) || existing?.photoUri,
    photoName: input.photoName?.trim() || existing?.photoName,
    audioUri: normalizeOptionalMediaUri(input.audioUri) || existing?.audioUri,
    audioName: input.audioName?.trim() || existing?.audioName,
    exportedVideoUri: normalizeOptionalMediaUri(input.exportedVideoUri) ||
      existing?.exportedVideoUri,
    trimStart: Number.isFinite(input.trimStart) ? input.trimStart : existing?.trimStart,
    trimEnd: Number.isFinite(input.trimEnd) ? input.trimEnd : existing?.trimEnd,
    vision: input.vision?.trim() || existing?.vision,
    genre: input.genre?.trim() || existing?.genre,
    bpm: input.bpm?.trim() || existing?.bpm,
    releaseDate: input.releaseDate?.trim() || existing?.releaseDate,
    label: input.label?.trim() || existing?.label,
    collaborators: input.collaborators?.trim() || existing?.collaborators,
    themeColor: input.themeColor?.trim() || existing?.themeColor,
    customCoverUri:
      normalizeOptionalMediaUri(input.customCoverUri) || existing?.customCoverUri,
    innerBackgroundUri:
      normalizeOptionalMediaUri(input.innerBackgroundUri) ||
      existing?.innerBackgroundUri,
    artistName: input.artistName?.trim() || existing?.artistName,
    linkedProjectId: input.linkedProjectId?.trim() || existing?.linkedProjectId,
    templateName: input.templateName?.trim() || existing?.templateName,
    clipDurationSec: Number.isFinite(input.clipDurationSec)
      ? input.clipDurationSec
      : existing?.clipDurationSec,
    spkStep: input.spkStep ?? existing?.spkStep,
    status: input.status ?? existing?.status ?? "draft",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const remaining = projects.filter((project) => project.id !== id);
  await writeProjects([next, ...remaining]);
  return next;
}

export async function removeLocalProject(projectId: string): Promise<void> {
  const id = projectId.trim();
  if (!id) return;
  const projects = await readProjects();
  await writeProjects(projects.filter((project) => project.id !== id));
}
