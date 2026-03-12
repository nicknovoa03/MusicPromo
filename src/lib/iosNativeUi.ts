import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

export const IOS_NATIVE_UI_PHASE5_FLAG_NAME = "EXPO_PUBLIC_IOS_NATIVE_UI_PHASE5";

type ExpoUINativeModule = Record<string, unknown>;
export type ExpoSwiftUIModule = typeof import("@expo/ui/swift-ui");
export type ExpoSwiftUIModifiersModule = typeof import("@expo/ui/swift-ui/modifiers");

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
let cachedExpoSwiftUIModule: ExpoSwiftUIModule | null | undefined;
let cachedExpoSwiftUIModifiersModule: ExpoSwiftUIModifiersModule | null | undefined;
const IOS_NATIVE_UI_PHASE5_DISABLED_VALUES = new Set(["0", "false", "off", "no"]);
const IOS_NATIVE_UI_PHASE5_ENABLED_VALUES = new Set(["1", "true", "on", "yes"]);

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

export function loadExpoSwiftUIModule() {
  if (cachedExpoSwiftUIModule !== undefined) {
    return cachedExpoSwiftUIModule;
  }
  if (!isExpoUINativeModuleAvailable()) {
    cachedExpoSwiftUIModule = null;
    return cachedExpoSwiftUIModule;
  }

  try {
    cachedExpoSwiftUIModule = require("@expo/ui/swift-ui") as ExpoSwiftUIModule;
  } catch {
    cachedExpoSwiftUIModule = null;
  }

  return cachedExpoSwiftUIModule;
}

export function loadExpoSwiftUIModifiersModule() {
  if (cachedExpoSwiftUIModifiersModule !== undefined) {
    return cachedExpoSwiftUIModifiersModule;
  }
  if (!isExpoUINativeModuleAvailable()) {
    cachedExpoSwiftUIModifiersModule = null;
    return cachedExpoSwiftUIModifiersModule;
  }

  try {
    cachedExpoSwiftUIModifiersModule = require("@expo/ui/swift-ui/modifiers") as ExpoSwiftUIModifiersModule;
  } catch {
    cachedExpoSwiftUIModifiersModule = null;
  }

  return cachedExpoSwiftUIModifiersModule;
}

function normalizeIOSNativeUIPhase5FlagValue(value: string | undefined) {
  if (value === undefined) {
    return { enabled: true, valid: true };
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return { enabled: true, valid: true };
  }
  if (IOS_NATIVE_UI_PHASE5_DISABLED_VALUES.has(normalized)) {
    return { enabled: false, valid: true };
  }
  if (IOS_NATIVE_UI_PHASE5_ENABLED_VALUES.has(normalized)) {
    return { enabled: true, valid: true };
  }
  return { enabled: true, valid: false };
}

export function isIOSNativeUIPhase5FlagEnabled() {
  return normalizeIOSNativeUIPhase5FlagValue(
    process.env.EXPO_PUBLIC_IOS_NATIVE_UI_PHASE5,
  ).enabled;
}

export function isIOSNativeUIPhase5FlagValueValid(
  value: string | undefined = process.env.EXPO_PUBLIC_IOS_NATIVE_UI_PHASE5,
) {
  return normalizeIOSNativeUIPhase5FlagValue(value).valid;
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
  const flagEnabled = normalizeIOSNativeUIPhase5FlagValue(flagValue).enabled;
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
