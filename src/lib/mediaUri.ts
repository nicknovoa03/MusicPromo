import * as FileSystem from "expo-file-system/legacy";

const URI_SCHEME_REGEX = /^[a-z][a-z0-9+.-]*:\/\//i;

function addFileSchemeForAbsolutePath(uri: string): string {
  if (URI_SCHEME_REGEX.test(uri)) return uri;
  if (!uri.startsWith("/")) return uri;
  return `file://${uri}`;
}

function stripFileScheme(uri: string): string {
  return uri.startsWith("file://") ? uri.slice("file://".length) : uri;
}

function trimLeadingSlashes(value: string): string {
  return value.replace(/^\/+/, "");
}

function rebaseIosContainerPath(uri: string): string {
  const rawPath = stripFileScheme(uri);
  const documentMarker = "/Documents/";
  const cacheMarker = "/Library/Caches/";

  const documentIndex = rawPath.indexOf(documentMarker);
  if (documentIndex >= 0 && FileSystem.documentDirectory) {
    const relativePath = trimLeadingSlashes(
      rawPath.slice(documentIndex + documentMarker.length),
    );
    return `${FileSystem.documentDirectory}${relativePath}`;
  }

  const cacheIndex = rawPath.indexOf(cacheMarker);
  if (cacheIndex >= 0 && FileSystem.cacheDirectory) {
    const relativePath = trimLeadingSlashes(
      rawPath.slice(cacheIndex + cacheMarker.length),
    );
    return `${FileSystem.cacheDirectory}${relativePath}`;
  }

  return uri;
}

export function normalizeMediaUri(uri?: string | null): string {
  if (!uri) return "";
  const trimmed = uri.trim();
  if (!trimmed) return "";

  if (
    trimmed.startsWith("content://") ||
    trimmed.startsWith("ph://") ||
    trimmed.startsWith("assets-library://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }

  const withScheme = addFileSchemeForAbsolutePath(trimmed);
  if (!withScheme.startsWith("file://")) return withScheme;

  if (
    withScheme.startsWith("file:///var/mobile/Containers/Data/Application/") ||
    withScheme.startsWith("file:///private/var/mobile/Containers/Data/Application/")
  ) {
    return rebaseIosContainerPath(withScheme);
  }

  return withScheme;
}

export function normalizeOptionalMediaUri(
  uri?: string | null,
): string | undefined {
  const normalized = normalizeMediaUri(uri);
  return normalized || undefined;
}
