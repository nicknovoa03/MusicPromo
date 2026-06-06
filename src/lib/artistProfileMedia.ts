import * as ImagePicker from "expo-image-picker";
import { persistPickedMediaFile } from "@/lib/mediaStorage";
import { ensurePhotosAccess } from "@/lib/permissions";

type PickImageOptions = {
  clerkUserId?: string | null;
  localGuest?: boolean;
};

export async function pickArtistProfileImage(
  fileNameFallback: string,
  options?: PickImageOptions,
): Promise<{ uri: string } | { error: "needs_primer" | "denied" | "cancelled" }> {
  const gate = await ensurePhotosAccess(options?.clerkUserId, {
    localGuest: options?.localGuest,
  });
  if (!gate.ok) {
    if (gate.status === "needs_primer") {
      return { error: "needs_primer" };
    }
    return { error: "denied" };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 1,
    allowsEditing: false,
    preferredAssetRepresentationMode:
      ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });
  if (result.canceled || !result.assets[0]) {
    return { error: "cancelled" };
  }

  const picked = result.assets[0];
  const uri = await persistPickedMediaFile({
    sourceUri: picked.uri,
    fileNameHint:
      picked.fileName ?? picked.uri.split("/").pop() ?? fileNameFallback,
  });
  return { uri };
}
