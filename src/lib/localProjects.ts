import AsyncStorage from "@react-native-async-storage/async-storage";
import { normalizeOptionalMediaUri } from "@/lib/mediaUri";

const LOCAL_PROJECTS_KEY = "musicpromo:local-projects";

type LocalProjectStatus = "draft" | "exported";
type LocalProjectAspectRatio = "9:16" | "1:1";

export type LocalProject = {
  id: string;
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
  status: LocalProjectStatus;
  createdAt: number;
  updatedAt: number;
};

type UpsertLocalProjectInput = {
  id?: string;
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
  status?: LocalProjectStatus;
};

function normalizeAspectRatio(value: unknown): LocalProjectAspectRatio {
  return value === "1:1" ? "1:1" : "9:16";
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

  return {
    id,
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
