export function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function fileNameFromUri(uri?: string): string {
  if (!uri) return "";
  const withoutQuery = uri.split("?")[0] ?? uri;
  const rawName = withoutQuery.split("/").pop() ?? "";
  return safeDecodeURIComponent(rawName);
}
