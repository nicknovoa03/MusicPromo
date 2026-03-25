import Constants, { ExecutionEnvironment } from "expo-constants";

/**
 * Returns true when running inside Expo Go.
 * Use this to gate features that require a development or production build
 * (e.g. FFmpeg rendering, push notifications, OAuth SSO).
 */
export function isRunningInExpoGo(): boolean {
  return (
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
    Constants.appOwnership === "expo"
  );
}
