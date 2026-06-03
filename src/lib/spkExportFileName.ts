import * as FileSystem from "expo-file-system/legacy";

export const SPK_EXPORT_SLIDE_IDENTIFIERS = [
  "cover",
  "track-details",
  "vision",
  "bio",
] as const;

export type SpkExportSlideIdentifier = (typeof SPK_EXPORT_SLIDE_IDENTIFIERS)[number];

function sanitizeFileNameSegment(value: string, fallback: string): string {
  const normalized = value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);

  return normalized || fallback;
}

/** `{projectName}-spk-{slideIdentifier}-{projectId}.jpg` */
export function buildSpkExportFileName(
  projectName: string,
  slideIdentifier: string,
  projectId: string,
): string {
  const safeProject = sanitizeFileNameSegment(projectName, "untitled");
  const safeSlide = sanitizeFileNameSegment(slideIdentifier, "slide");
  const safeProjectId = sanitizeFileNameSegment(projectId, "project");
  return `${safeProject}-spk-${safeSlide}-${safeProjectId}.jpg`;
}

export async function copyCaptureToNamedSpkExport(
  sourceUri: string,
  projectName: string,
  slideIdentifier: SpkExportSlideIdentifier | string,
  projectId: string,
): Promise<string> {
  if (!FileSystem.cacheDirectory) return sourceUri;

  const fileName = buildSpkExportFileName(projectName, slideIdentifier, projectId);
  const targetUri = `${FileSystem.cacheDirectory}${fileName}`;

  try {
    await FileSystem.copyAsync({ from: sourceUri, to: targetUri });
    return targetUri;
  } catch (error) {
    console.warn("Failed to copy SPK export with filename:", error);
    return sourceUri;
  }
}
