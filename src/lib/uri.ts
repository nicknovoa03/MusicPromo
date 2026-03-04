export function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

const URI_PARAM_PREFIX = "u:";

export function encodeUriParam(uri?: string | null): string {
  if (!uri) return "";
  return `${URI_PARAM_PREFIX}${encodeURIComponent(uri)}`;
}

export function decodeUriParam(value?: string | null): string {
  if (!value) return "";
  if (!value.startsWith(URI_PARAM_PREFIX)) return value;
  return safeDecodeURIComponent(value.slice(URI_PARAM_PREFIX.length));
}

export function fileNameFromUri(uri?: string): string {
  if (!uri) return "";
  const withoutQuery = uri.split("?")[0] ?? uri;
  const rawName = withoutQuery.split("/").pop() ?? "";
  return safeDecodeURIComponent(rawName);
}
