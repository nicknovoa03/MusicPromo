import { useLocalSearchParams } from "expo-router";

function firstParam(p: string | string[] | undefined): string {
  return Array.isArray(p) ? (p[0] ?? "") : (p ?? "");
}

/** True when this screen was opened from the home project list (not via Next through the wizard). */
export function useSpkOpenedFromHome(): boolean {
  const params = useLocalSearchParams<{ fromHome?: string }>();
  return firstParam(params.fromHome) === "1";
}
