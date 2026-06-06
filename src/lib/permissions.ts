import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";

export type PermissionPrimerId = "perm-photos" | "perm-save" | "perm-audio";

export type PrimerAckStatus = "pending" | "acknowledged" | "deferred";

export type PermissionGateResult =
  | { ok: true; status: "granted" | "n/a" }
  | { ok: false; status: "needs_primer"; primerId: PermissionPrimerId }
  | { ok: false; status: "denied" };

const PRIMER_KEY_PREFIX = "musicpromo:primer";
const LOCAL_GUEST_PRIMER_SUFFIX = ":local-guest";

type PrimerLocalOptions = {
  localGuest?: boolean;
};

function primerStorageKey(
  primerId: PermissionPrimerId,
  clerkUserId?: string | null,
  options?: PrimerLocalOptions,
) {
  if (clerkUserId) {
    return `${PRIMER_KEY_PREFIX}:${primerId}:${clerkUserId}`;
  }
  if (options?.localGuest) {
    return `${PRIMER_KEY_PREFIX}:${primerId}${LOCAL_GUEST_PRIMER_SUFFIX}`;
  }
  return null;
}

export async function getPrimerAckStatus(
  primerId: PermissionPrimerId,
  clerkUserId?: string | null,
  options?: PrimerLocalOptions,
): Promise<PrimerAckStatus> {
  const key = primerStorageKey(primerId, clerkUserId, options);
  if (!key) return "pending";

  try {
    const value = await AsyncStorage.getItem(key);
    if (value === "acknowledged" || value === "deferred") return value;
    return "pending";
  } catch (error) {
    console.warn("Failed to read primer ack status:", error);
    return "pending";
  }
}

async function setPrimerAckStatus(
  primerId: PermissionPrimerId,
  status: Exclude<PrimerAckStatus, "pending">,
  clerkUserId?: string | null,
  options?: PrimerLocalOptions,
): Promise<boolean> {
  const key = primerStorageKey(primerId, clerkUserId, options);
  if (!key) return false;

  try {
    await AsyncStorage.setItem(key, status);
    return true;
  } catch (error) {
    console.warn("Failed to persist primer ack status:", error);
    return false;
  }
}

export async function setPrimerAcknowledged(
  primerId: PermissionPrimerId,
  clerkUserId?: string | null,
  options?: PrimerLocalOptions,
): Promise<boolean> {
  return setPrimerAckStatus(primerId, "acknowledged", clerkUserId, options);
}

export async function setPrimerDeferred(
  primerId: PermissionPrimerId,
  clerkUserId?: string | null,
  options?: PrimerLocalOptions,
): Promise<boolean> {
  return setPrimerAckStatus(primerId, "deferred", clerkUserId, options);
}

export async function getPhotosPermissionStatus(): Promise<ImagePicker.PermissionStatus> {
  const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
  return status;
}

export async function requestPhotosPermission(): Promise<ImagePicker.MediaLibraryPermissionResponse> {
  return ImagePicker.requestMediaLibraryPermissionsAsync();
}

export async function getSavePermissionStatus(): Promise<MediaLibrary.PermissionStatus> {
  const { status } = await MediaLibrary.getPermissionsAsync();
  return status;
}

export async function requestSavePermission(): Promise<MediaLibrary.PermissionResponse> {
  return MediaLibrary.requestPermissionsAsync();
}

/** True when the user must see our primer before any system dialog. */
export function shouldShowPhotosPrimer(
  ack: PrimerAckStatus,
  permissionStatus: ImagePicker.PermissionStatus,
): boolean {
  if (permissionStatus === "granted") return false;
  return ack !== "acknowledged";
}

export function shouldShowSavePrimer(
  ack: PrimerAckStatus,
  permissionStatus: MediaLibrary.PermissionStatus,
): boolean {
  if (permissionStatus === "granted") return false;
  return ack !== "acknowledged";
}

export function shouldShowAudioPrimer(ack: PrimerAckStatus): boolean {
  return ack !== "acknowledged";
}

export async function ensurePhotosAccess(
  clerkUserId?: string | null,
  options?: PrimerLocalOptions,
): Promise<PermissionGateResult> {
  const permissionStatus = await getPhotosPermissionStatus();
  if (permissionStatus === "granted") {
    return { ok: true, status: "granted" };
  }

  const ack = await getPrimerAckStatus("perm-photos", clerkUserId, options);
  if (shouldShowPhotosPrimer(ack, permissionStatus)) {
    return { ok: false, status: "needs_primer", primerId: "perm-photos" };
  }

  const response = await requestPhotosPermission();
  if (response.granted || response.status === "granted") {
    return { ok: true, status: "granted" };
  }
  return { ok: false, status: "denied" };
}

export async function ensureSaveAccess(
  clerkUserId?: string | null,
  options?: PrimerLocalOptions,
): Promise<PermissionGateResult> {
  const permissionStatus = await getSavePermissionStatus();
  if (permissionStatus === "granted") {
    return { ok: true, status: "granted" };
  }

  const ack = await getPrimerAckStatus("perm-save", clerkUserId, options);
  if (shouldShowSavePrimer(ack, permissionStatus)) {
    return { ok: false, status: "needs_primer", primerId: "perm-save" };
  }

  const response = await requestSavePermission();
  if (response.granted || response.status === "granted") {
    return { ok: true, status: "granted" };
  }
  return { ok: false, status: "denied" };
}

export async function ensureAudioAccess(
  clerkUserId?: string | null,
  options?: PrimerLocalOptions,
): Promise<PermissionGateResult> {
  const ack = await getPrimerAckStatus("perm-audio", clerkUserId, options);
  if (shouldShowAudioPrimer(ack)) {
    return { ok: false, status: "needs_primer", primerId: "perm-audio" };
  }
  return { ok: true, status: "n/a" };
}

/** Call after user taps Continue on a photos primer — requests system dialog. */
export async function completePhotosPrimer(
  clerkUserId?: string | null,
  options?: PrimerLocalOptions,
): Promise<"granted" | "denied"> {
  await setPrimerAcknowledged("perm-photos", clerkUserId, options);
  const response = await requestPhotosPermission();
  return response.granted || response.status === "granted" ? "granted" : "denied";
}

/** Call after user taps Continue on save primer — requests system dialog. */
export async function completeSavePrimer(
  clerkUserId?: string | null,
  options?: PrimerLocalOptions,
): Promise<"granted" | "denied"> {
  await setPrimerAcknowledged("perm-save", clerkUserId, options);
  const response = await requestSavePermission();
  return response.granted || response.status === "granted" ? "granted" : "denied";
}

/** Audio has no iOS system dialog — Continue only marks primer complete. */
export async function completeAudioPrimer(
  clerkUserId?: string | null,
  options?: PrimerLocalOptions,
): Promise<"n/a"> {
  await setPrimerAcknowledged("perm-audio", clerkUserId, options);
  return "n/a";
}
