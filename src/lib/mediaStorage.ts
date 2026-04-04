import * as FileSystem from "expo-file-system/legacy";

const MEDIA_DIR_NAME = "musicpromo-media";

function cleanName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function extensionFromNameOrUri(name?: string, uri?: string) {
  const candidate = (name ?? uri ?? "").toLowerCase();
  const dot = candidate.lastIndexOf(".");
  if (dot < 0 || dot === candidate.length - 1) return "";
  const ext = candidate.slice(dot + 1);
  return /^[a-z0-9]{1,8}$/.test(ext) ? ext : "";
}

async function ensureMediaDirectory() {
  if (!FileSystem.documentDirectory) return null;
  const mediaDirectoryUri = `${FileSystem.documentDirectory}${MEDIA_DIR_NAME}/`;
  try {
    await FileSystem.makeDirectoryAsync(mediaDirectoryUri, { intermediates: true });
  } catch {
    // Directory may already exist.
  }
  return mediaDirectoryUri;
}

export async function persistPickedMediaFile(params: {
  sourceUri: string;
  fileNameHint?: string;
}) {
  const { sourceUri, fileNameHint } = params;
  if (!sourceUri) return sourceUri;

  const mediaDirectoryUri = await ensureMediaDirectory();
  if (!mediaDirectoryUri) return sourceUri;

  const ext = extensionFromNameOrUri(fileNameHint, sourceUri);
  const suffix = ext ? `.${ext}` : "";
  const fileName = cleanName(
    `media-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}${suffix}`,
  );
  const targetUri = `${mediaDirectoryUri}${fileName}`;

  try {
    await FileSystem.copyAsync({
      from: sourceUri,
      to: targetUri,
    });
    return targetUri;
  } catch (error) {
    console.warn("Failed to persist picked media file:", error);
    return sourceUri;
  }
}
