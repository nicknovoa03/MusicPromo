import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useConvexAuth, useQuery } from "convex/react";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { usePostHog } from "posthog-react-native";
import { api } from "../../convex/_generated/api";
import { colors, typography, spacing, radius } from "@/constants/tokens";
import type { EventName } from "@/lib/analytics";
import {
  DEFAULT_LOCAL_PROFILE_PREFERENCES,
  getLocalProfilePreferences,
} from "@/lib/localProfile";
import { extractEmbeddedAudioArtworkUri } from "@/lib/audioArtwork";
import { persistPickedMediaFile } from "@/lib/mediaStorage";
import { decodeUriParam, encodeUriParam } from "@/lib/uri";
import { useLocalSession } from "@/providers/localSession";

type Tab = "photo" | "audio";

interface MediaSelection {
  photoUri: string | null;
  photoName: string | null;
  audioUri: string | null;
  audioName: string | null;
  audioArtworkUri: string | null;
}

const VIDEO_LENGTH_PRESETS = [15, 30, 60] as const;

function firstParam(param: string | string[] | undefined) {
  return Array.isArray(param) ? param[0] : param;
}

function normalizeDefaultVideoLength(value: number | undefined) {
  if (!Number.isFinite(value)) return VIDEO_LENGTH_PRESETS[0];
  const safe = Math.max(15, Math.min(60, Math.round(value ?? 0)));

  return VIDEO_LENGTH_PRESETS.reduce((closest, candidate) => {
    return Math.abs(candidate - safe) < Math.abs(closest - safe)
      ? candidate
      : closest;
  }, VIDEO_LENGTH_PRESETS[0]);
}

export default function PickerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    projectId?: string;
    title?: string;
    photoUri?: string;
    photoName?: string;
    audioUri?: string;
    audioName?: string;
    aspectRatio?: "9:16" | "1:1";
    trimStart?: string;
    trimEnd?: string;
    initialTab?: Tab;
  }>();
  const posthog = usePostHog();
  const projectId = firstParam(params.projectId);
  const title = firstParam(params.title);
  const aspectRatio = firstParam(params.aspectRatio);
  const trimStart = firstParam(params.trimStart);
  const trimEnd = firstParam(params.trimEnd);
  const initialPhotoUri = decodeUriParam(firstParam(params.photoUri));
  const initialAudioUri = decodeUriParam(firstParam(params.audioUri));
  const initialTab =
    firstParam(params.initialTab) === "audio" ? "audio" : "photo";
  const { isAuthenticated } = useConvexAuth();
  const { isLocalGuest } = useLocalSession();
  const currentUser = useQuery(api.users.current);
  const [localPreferences, setLocalPreferences] = useState(
    DEFAULT_LOCAL_PROFILE_PREFERENCES
  );

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [media, setMedia] = useState<MediaSelection>({
    photoUri: initialPhotoUri || null,
    photoName: firstParam(params.photoName) || null,
    audioUri: initialAudioUri || null,
    audioName: firstParam(params.audioName) || null,
    audioArtworkUri: null,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isActive = true;

    (async () => {
      const prefs = await getLocalProfilePreferences();
      if (!isActive) return;
      setLocalPreferences(prefs);
    })();

    return () => {
      isActive = false;
    };
  }, []);

  const useLocalDefaults = isLocalGuest || !isAuthenticated;
  const preferredAspectRatio = useLocalDefaults
    ? localPreferences.defaultAspectRatio
    : currentUser?.preferences?.defaultAspectRatio ?? "9:16";
  const preferredVideoLength = useLocalDefaults
    ? localPreferences.defaultVideoLength
    : normalizeDefaultVideoLength(currentUser?.preferences?.defaultVideoLength);

  const track = useCallback(
    (event: EventName, props?: Record<string, string>) => {
      posthog?.capture(event, props);
    },
    [posthog],
  );

  const pickPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "MusicPromo needs access to your photos to create promo videos.",
      );
      return;
    }

    setLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const name =
          asset.fileName ?? asset.uri.split("/").pop() ?? "Photo";
        const photoUri = await persistPickedMediaFile({
          sourceUri: asset.uri,
          fileNameHint: name,
        });
        setMedia((prev) => ({
          ...prev,
          photoUri,
          photoName: name,
        }));
        track("photo_selected", { source: "camera_roll" });
      }
    } finally {
      setLoading(false);
    }
  }, [track]);

  const pickAudio = useCallback(async () => {
    setLoading(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["audio/mpeg", "audio/wav", "audio/x-m4a", "audio/mp4"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const audioUri = await persistPickedMediaFile({
          sourceUri: asset.uri,
          fileNameHint: asset.name,
        });
        const audioArtworkUri = await extractEmbeddedAudioArtworkUri({
          audioUri,
          name: asset.name,
          mimeType: asset.mimeType,
          size: asset.size,
        });
        setMedia((prev) => ({
          ...prev,
          audioUri,
          audioName: asset.name,
          audioArtworkUri,
        }));
        track("audio_selected", { format: asset.mimeType ?? "unknown" });
      }
    } finally {
      setLoading(false);
    }
  }, [track]);

  useEffect(() => {
    let isActive = true;
    const audioUri = media.audioUri;

    if (!audioUri || media.audioArtworkUri) return;

    (async () => {
      const artworkUri = await extractEmbeddedAudioArtworkUri({
        audioUri,
        name: media.audioName ?? undefined,
      });
      if (!isActive || !artworkUri) return;
      setMedia((prev) =>
        prev.audioUri === audioUri
          ? { ...prev, audioArtworkUri: artworkUri }
          : prev
      );
    })();

    return () => {
      isActive = false;
    };
  }, [media.audioUri, media.audioArtworkUri, media.audioName]);

  const handleAdd = useCallback(() => {
    if (activeTab === "photo") {
      if (media.photoUri && !media.audioUri) {
        setActiveTab("audio");
        return;
      }
    } else {
      if (media.audioUri && !media.photoUri) {
        setActiveTab("photo");
        return;
      }
    }

    if (media.photoUri && media.audioUri) {
      const nextAspectRatio = aspectRatio ?? preferredAspectRatio;
      const nextTrimStart = trimStart ?? "0";
      const nextTrimEnd = trimEnd ?? String(preferredVideoLength);
      const nextParams: Record<string, string> = {
        photoUri: encodeUriParam(media.photoUri),
        photoName: media.photoName ?? "Photo",
        audioUri: encodeUriParam(media.audioUri),
        audioName: media.audioName ?? "Audio",
        aspectRatio: nextAspectRatio,
        trimStart: nextTrimStart,
        trimEnd: nextTrimEnd,
      };

      if (projectId) nextParams.projectId = projectId;
      if (title) nextParams.title = title;

      router.push({
        pathname: "/create/editor" as const,
        params: nextParams,
      });
    }
  }, [
    activeTab,
    media,
    router,
    projectId,
    title,
    aspectRatio,
    trimStart,
    trimEnd,
    preferredAspectRatio,
    preferredVideoLength,
  ]);

  const canAdd = activeTab === "photo" ? !!media.photoUri : !!media.audioUri;
  const bothSelected = !!media.photoUri && !!media.audioUri;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)" as const);
            }
          }}
          style={styles.headerAction}
          accessibilityLabel="Cancel"
          accessibilityRole="button"
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>

        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, activeTab === "photo" && styles.tabActive]}
            onPress={() => setActiveTab("photo")}
            accessibilityLabel="Photos tab"
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "photo" }}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "photo" && styles.tabTextActive,
              ]}
            >
              Photos
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === "audio" && styles.tabActive]}
            onPress={() => setActiveTab("audio")}
            accessibilityLabel="Audio tab"
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "audio" }}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "audio" && styles.tabTextActive,
              ]}
            >
              Audio
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={handleAdd}
          style={[styles.headerAction, styles.headerActionRight]}
          disabled={!canAdd}
          accessibilityLabel={bothSelected ? "Continue to editor" : "Add media"}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canAdd }}
        >
          <Text style={[styles.addText, !canAdd && styles.addTextDisabled]}>
            {bothSelected ? "Next" : "Add"}
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      {activeTab === "photo" ? (
        <View style={styles.content}>
          {media.photoUri ? (
            <View style={styles.selectedMedia}>
              <Image
                source={{ uri: media.photoUri }}
                style={styles.photoPreview}
                accessibilityLabel="Selected photo"
              />
              <View style={styles.selectedInfo}>
                <View style={styles.selectedRow}>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.accent.success}
                  />
                  <Text style={styles.selectedName} numberOfLines={1}>
                    {media.photoName}
                  </Text>
                </View>
                <Pressable
                  onPress={pickPhoto}
                  style={styles.changeButton}
                  accessibilityLabel="Change photo"
                  accessibilityRole="button"
                >
                  <Text style={styles.changeText}>Change</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.pickArea,
                pressed && styles.pickAreaPressed,
              ]}
              onPress={pickPhoto}
              disabled={loading}
              accessibilityLabel="Select a photo from camera roll"
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color={colors.accent.primary} size="large" />
              ) : (
                <>
                  <View style={styles.pickIcon}>
                    <Ionicons
                      name="image-outline"
                      size={40}
                      color={colors.accent.primary}
                    />
                  </View>
                  <Text style={styles.pickTitle}>Select Photo</Text>
                  <Text style={styles.pickHint}>
                    Choose an image from your camera roll
                  </Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      ) : (
        <View style={styles.content}>
          {media.photoUri ? (
            <Pressable
              style={({ pressed }) => [
                styles.linkedMediaCard,
                pressed && styles.linkedMediaCardPressed,
              ]}
              onPress={() => setActiveTab("photo")}
              accessibilityLabel="View selected photo"
              accessibilityRole="button"
            >
              <Image
                source={{ uri: media.photoUri }}
                style={styles.linkedMediaThumb}
                accessibilityLabel="Selected photo thumbnail"
              />
              <View style={styles.linkedMediaInfo}>
                <Text style={styles.linkedMediaLabel}>Selected Photo</Text>
                <Text style={styles.linkedMediaName} numberOfLines={1}>
                  {media.photoName ?? "Photo"}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.light.textSecondary}
              />
            </Pressable>
          ) : null}

          {media.audioUri ? (
            <View style={styles.selectedMedia}>
              <View style={styles.audioThumb}>
                {media.audioArtworkUri ? (
                  <Image
                    source={{ uri: media.audioArtworkUri }}
                    style={styles.audioArtwork}
                    accessibilityLabel="Audio album artwork"
                  />
                ) : (
                  <Ionicons
                    name="musical-note"
                    size={32}
                    color={colors.accent.primary}
                  />
                )}
              </View>
              <View style={styles.selectedInfo}>
                <View style={styles.selectedRow}>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.accent.success}
                  />
                  <Text style={styles.selectedName} numberOfLines={1}>
                    {media.audioName}
                  </Text>
                </View>
                <Pressable
                  onPress={pickAudio}
                  style={styles.changeButton}
                  accessibilityLabel="Change audio"
                  accessibilityRole="button"
                >
                  <Text style={styles.changeText}>Change</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.pickArea,
                pressed && styles.pickAreaPressed,
              ]}
              onPress={pickAudio}
              disabled={loading}
              accessibilityLabel="Select an audio file"
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color={colors.accent.primary} size="large" />
              ) : (
                <>
                  <View style={styles.pickIcon}>
                    <Ionicons
                      name="musical-note-outline"
                      size={40}
                      color={colors.accent.primary}
                    />
                  </View>
                  <Text style={styles.pickTitle}>Select Audio</Text>
                  <Text style={styles.pickHint}>MP3, WAV, or M4A files</Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      )}

      {/* Bottom status bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusItem}>
          <Ionicons
            name={media.photoUri ? "checkmark-circle" : "ellipse-outline"}
            size={16}
            color={
              media.photoUri
                ? colors.accent.success
                : colors.light.textSecondary
            }
          />
          <Text
            style={[
              styles.statusText,
              media.photoUri && styles.statusTextDone,
            ]}
          >
            Photo
          </Text>
        </View>
        <View style={styles.statusDivider} />
        <View style={styles.statusItem}>
          <Ionicons
            name={media.audioUri ? "checkmark-circle" : "ellipse-outline"}
            size={16}
            color={
              media.audioUri
                ? colors.accent.success
                : colors.light.textSecondary
            }
          />
          <Text
            style={[
              styles.statusText,
              media.audioUri && styles.statusTextDone,
            ]}
          >
            Audio
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.light.border,
  },
  headerAction: {
    width: 64,
    height: 44,
    justifyContent: "center",
  },
  headerActionRight: {
    alignItems: "flex-end",
  },
  cancelText: {
    ...typography.body,
    color: colors.light.text,
  },
  addText: {
    ...typography.button,
    color: colors.accent.primary,
  },
  addTextDisabled: {
    opacity: 0.35,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.light.surface,
    borderRadius: radius.full,
    padding: 2,
  },
  tab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  tabActive: {
    backgroundColor: colors.light.background,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.light.textSecondary,
  },
  tabTextActive: {
    color: colors.light.text,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  linkedMediaCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.light.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.light.border,
    padding: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  linkedMediaCardPressed: {
    opacity: 0.85,
  },
  linkedMediaThumb: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
  },
  linkedMediaInfo: {
    flex: 1,
  },
  linkedMediaLabel: {
    ...typography.caption,
    color: colors.light.textSecondary,
    marginBottom: 2,
  },
  linkedMediaName: {
    ...typography.body,
    color: colors.light.text,
    fontWeight: "600",
  },
  pickArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.light.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.light.border,
    borderStyle: "dashed",
  },
  pickAreaPressed: {
    opacity: 0.7,
    backgroundColor: colors.light.border,
  },
  pickIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.light.background,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  pickTitle: {
    ...typography.button,
    color: colors.light.text,
    marginBottom: spacing.xs,
  },
  pickHint: {
    ...typography.caption,
    color: colors.light.textSecondary,
  },
  selectedMedia: {
    backgroundColor: colors.light.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  photoPreview: {
    width: "100%",
    aspectRatio: 1,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  audioThumb: {
    width: "100%",
    height: 160,
    backgroundColor: colors.light.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  audioArtwork: {
    width: "100%",
    height: "100%",
  },
  selectedInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  selectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  selectedName: {
    ...typography.body,
    color: colors.light.text,
    flex: 1,
  },
  changeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.light.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.light.border,
  },
  changeText: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.accent.primary,
  },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.light.border,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  statusText: {
    ...typography.caption,
    color: colors.light.textSecondary,
  },
  statusTextDone: {
    color: colors.accent.success,
    fontWeight: "600",
  },
  statusDivider: {
    width: 24,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.light.border,
  },
});
