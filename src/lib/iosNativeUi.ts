import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

export const IOS_NATIVE_UI_PHASE5_FLAG_NAME = "EXPO_PUBLIC_IOS_NATIVE_UI_PHASE5";

type ExpoUINativeModule = Record<string, unknown>;
export type ExpoSwiftUIModule = typeof import("@expo/ui/swift-ui");

type IOSNativeUIPhase5AvailabilityOptions = {
  minIOSVersion?: number;
};

export type IOSNativeUIPhase5Availability = {
  enabled: boolean;
  flagEnabled: boolean;
  flagValue: string | undefined;
  isIOS: boolean;
  iosVersionMajor: number | null;
  runtimeAvailable: boolean;
  supportsRequestedOSVersion: boolean;
};

let cachedExpoUINativeModuleAvailable: boolean | undefined;

function getIOSVersionMajor() {
  if (Platform.OS !== "ios") return null;

  if (typeof Platform.Version === "number") {
    return Platform.Version;
  }

  const majorVersion = Number.parseInt(String(Platform.Version).split(".")[0] ?? "", 10);
  return Number.isFinite(majorVersion) ? majorVersion : null;
}

function getExpoUINativeModule() {
  return requireOptionalNativeModule<ExpoUINativeModule>("ExpoUI");
}

export function isIOSNativeUIPhase5FlagEnabled() {
  return process.env.EXPO_PUBLIC_IOS_NATIVE_UI_PHASE5 === "1";
}

export function isExpoUINativeModuleAvailable() {
  if (cachedExpoUINativeModuleAvailable !== undefined) {
    return cachedExpoUINativeModuleAvailable;
  }

  cachedExpoUINativeModuleAvailable = getExpoUINativeModule() !== null;
  return cachedExpoUINativeModuleAvailable;
}

export function getIOSNativeUIPhase5Availability(
  options: IOSNativeUIPhase5AvailabilityOptions = {},
): IOSNativeUIPhase5Availability {
  const { minIOSVersion = 0 } = options;
  const isIOS = Platform.OS === "ios";
  const flagValue = process.env.EXPO_PUBLIC_IOS_NATIVE_UI_PHASE5;
  const flagEnabled = flagValue === "1";
  const iosVersionMajor = getIOSVersionMajor();
  const runtimeAvailable = isIOS && isExpoUINativeModuleAvailable();
  const supportsRequestedOSVersion =
    isIOS && iosVersionMajor !== null && iosVersionMajor >= minIOSVersion;

  return {
    enabled: isIOS && flagEnabled && runtimeAvailable && supportsRequestedOSVersion,
    flagEnabled,
    flagValue,
    isIOS,
    iosVersionMajor,
    runtimeAvailable,
    supportsRequestedOSVersion,
  };
}

export function canUseIOSNativeUIPhase5(
  options: IOSNativeUIPhase5AvailabilityOptions = {},
) {
  return getIOSNativeUIPhase5Availability(options).enabled;
}
