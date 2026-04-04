import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

type ExpoUINativeModule = Record<string, unknown>;
export type ExpoSwiftUIModule = typeof import("@expo/ui/swift-ui");
export type ExpoSwiftUIModifiersModule = typeof import("@expo/ui/swift-ui/modifiers");

type IOSNativeUIPhase5AvailabilityOptions = {
  minIOSVersion?: number;
};

export type IOSNativeUIPhase5Availability = {
  enabled: boolean;
  isIOS: boolean;
  iosVersionMajor: number | null;
  runtimeAvailable: boolean;
  supportsRequestedOSVersion: boolean;
};

let cachedExpoUINativeModuleAvailable: boolean | undefined;
let cachedExpoSwiftUIModule: ExpoSwiftUIModule | null | undefined;
let cachedExpoSwiftUIModifiersModule: ExpoSwiftUIModifiersModule | null | undefined;

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
  const iosVersionMajor = getIOSVersionMajor();
  const runtimeAvailable = isIOS && isExpoUINativeModuleAvailable();
  const supportsRequestedOSVersion =
    isIOS && iosVersionMajor !== null && iosVersionMajor >= minIOSVersion;

  return {
    enabled: isIOS && runtimeAvailable && supportsRequestedOSVersion,
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
