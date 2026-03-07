import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { StatusBar } from "expo-status-bar";
import { useIsFocused } from "@react-navigation/native";
import { useConvexAuth, useQuery } from "convex/react";
import * as ExpoSwiftUI from "@expo/ui/swift-ui";
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
import { normalizeMediaUri } from "@/lib/mediaUri";
import { useLocalSession } from "@/providers/localSession";
import {
  normalizeTemplateTweaks,
  parseTemplateTweaksParam,
  resolveTemplateId,
  serializeTemplateTweaksParam,
} from "@/lib/templates";
import {
  getIOSNativeUIPhase5Availability,
  type ExpoSwiftUIModule,
} from "@/lib/iosNativeUi";

type Tab = "photo" | "audio";
type LoadingTarget = Tab | null;

interface MediaSelection {
  photoUri: string | null;
  photoName: string | null;
  audioUri: string | null;
  audioName: string | null;
  audioArtworkUri: string | null;
}

const DEFAULT_NEW_PROJECT_TRIM_END = 5;
const IPHONE_EDGE_RADIUS = 36;

function firstParam(param: string | string[] | undefined) {
  return Array.isArray(param) ? param[0] : param;
}

interface PickerScreenProps {
  tabEmbedded?: boolean;
}

export default function PickerScreen({ tabEmbedded = false }: PickerScreenProps) {
  const { width: windowWidth } = useWindowDimensions();
  const isFocused = useIsFocused();
  const router = useRouter();
  const params = useLocalSearchParams<{
    projectId?: string;
    localProjectId?: string;
    title?: string;
    photoUri?: string;
    photoName?: string;
    audioUri?: string;
    audioName?: string;
    aspectRatio?: "9:16" | "1:1";
    templateId?: string;
    templateTweaks?: string;
    trimStart?: string;
    trimEnd?: string;
    spinSpeed?: string;
    recordTransparency?: string;
    stageBackgroundColor?: string;
    showTemplateInfo?: string;
    initialTab?: Tab;
    returnToEditor?: string;
  }>();
  const posthog = usePostHog();
  const projectId = firstParam(params.projectId);
  const localProjectId = firstParam(params.localProjectId);
  const title = firstParam(params.title);
  const aspectRatio = firstParam(params.aspectRatio);
  const templateId = resolveTemplateId(firstParam(params.templateId));
  const templateTweaksParam = firstParam(params.templateTweaks);
  const showTemplateInfoParam = firstParam(params.showTemplateInfo);
  const trimStart = firstParam(params.trimStart);
  const trimEnd = firstParam(params.trimEnd);
  const spinSpeed = firstParam(params.spinSpeed);
  const recordTransparency = firstParam(params.recordTransparency);
  const stageBackgroundColor = firstParam(params.stageBackgroundColor);
  const parsedTemplateTweaks = parseTemplateTweaksParam(templateTweaksParam);
  const templateTweaks = parsedTemplateTweaks
    ? parsedTemplateTweaks
    : normalizeTemplateTweaks({
        spinSpeed: spinSpeed ? Number(spinSpeed) : undefined,
        recordTransparency: recordTransparency
          ? Number(recordTransparency)
          : undefined,
        stageBackgroundColor: stageBackgroundColor ?? undefined,
      });
  const serializedTemplateTweaks = serializeTemplateTweaksParam(templateTweaks);
  const initialPhotoUri = normalizeMediaUri(decodeUriParam(firstParam(params.photoUri)));
  const initialAudioUri = normalizeMediaUri(decodeUriParam(firstParam(params.audioUri)));
  const returnToEditor = firstParam(params.returnToEditor) === "1";
  const { isAuthenticated } = useConvexAuth();
  const { isLocalGuest } = useLocalSession();
  const currentUser = useQuery(api.users.current);
  const [localPreferences, setLocalPreferences] = useState(
    DEFAULT_LOCAL_PROFILE_PREFERENCES
  );

  const [media, setMedia] = useState<MediaSelection>({
    photoUri: initialPhotoUri || null,
    photoName: firstParam(params.photoName) || null,
    audioUri: initialAudioUri || null,
    audioName: firstParam(params.audioName) || null,
    audioArtworkUri: null,
  });
  const [loadingTarget, setLoadingTarget] = useState<LoadingTarget>(null);
  const [contentHeight, setContentHeight] = useState(0);

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
  const nativePickerAvailability = getIOSNativeUIPhase5Availability({
    minIOSVersion: 16,
  });
  const nativePickerEnabledByContract = nativePickerAvailability.enabled;
  const expoSwiftUI = nativePickerEnabledByContract
    ? (ExpoSwiftUI as ExpoSwiftUIModule)
    : null;
  const expoSwiftUIAny = expoSwiftUI as Record<string, unknown> | null;
  const hasNativePickerSummaryComponents = Boolean(
    expoSwiftUIAny &&
      "Host" in expoSwiftUIAny &&
      "Form" in expoSwiftUIAny &&
      "Section" in expoSwiftUIAny &&
      "LabeledContent" in expoSwiftUIAny &&
      "Text" in expoSwiftUIAny,
  );
  const canUseNativePickerSummary =
    nativePickerEnabledByContract &&
    expoSwiftUI !== null &&
    hasNativePickerSummaryComponents;

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

    setLoadingTarget("photo");
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
        allowsEditing: false,
        // Prefer iOS-compatible output (e.g. JPEG) to avoid HEIC decode issues
        // in FFmpeg-based rendering on release builds.
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
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
      setLoadingTarget((current) => (current === "photo" ? null : current));
    }
  }, [track]);

  const pickAudio = useCallback(async () => {
    const hadAudioSelected = !!media.audioUri;
    const hadPhotoSelected = !!media.photoUri;

    setLoadingTarget("audio");
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

        if (hadAudioSelected && hadPhotoSelected && audioArtworkUri) {
          Alert.alert(
            "Use new album artwork?",
            "You changed audio. Replace your current photo with this track's artwork?",
            [
              { text: "Keep current photo", style: "cancel" },
              {
                text: "Use artwork",
                onPress: () => {
                  setMedia((prev) => ({
                    ...prev,
                    photoUri: audioArtworkUri,
                    photoName: "Album Artwork",
                  }));
                  track("photo_selected", { source: "audio_artwork" });
                },
              },
            ],
          );
        }

        track("audio_selected", { format: asset.mimeType ?? "unknown" });
      }
    } finally {
      setLoadingTarget((current) => (current === "audio" ? null : current));
    }
  }, [media.audioUri, media.photoUri, track]);

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

  const navigateToEditor = useCallback(
    (selection: MediaSelection) => {
      if (!selection.photoUri || !selection.audioUri) return;
      const nextAspectRatio = aspectRatio ?? preferredAspectRatio;
      const nextTrimStart = trimStart ?? "0";
      const nextTrimEnd = trimEnd ?? String(DEFAULT_NEW_PROJECT_TRIM_END);
      const nextParams: Record<string, string> = {
        photoUri: encodeUriParam(selection.photoUri),
        photoName: selection.photoName ?? "Photo",
        audioUri: encodeUriParam(selection.audioUri),
        audioName: selection.audioName ?? "Audio",
        aspectRatio: nextAspectRatio,
        templateId,
        trimStart: nextTrimStart,
        trimEnd: nextTrimEnd,
        templateTweaks: serializedTemplateTweaks,
        showTemplateInfo: showTemplateInfoParam === "1" ? "1" : "0",
      };

      if (projectId) nextParams.projectId = projectId;
      if (localProjectId) nextParams.localProjectId = localProjectId;
      if (title) nextParams.title = title;

      router.push({
        pathname: "/create/editor" as const,
        params: nextParams,
      });
    },
    [
      aspectRatio,
      preferredAspectRatio,
      trimStart,
      trimEnd,
      serializedTemplateTweaks,
      showTemplateInfoParam,
      templateId,
      projectId,
      localProjectId,
      title,
      router,
    ],
  );

  const handleUseArtworkAsPhoto = useCallback(() => {
    if (!media.audioArtworkUri) return;
    setMedia((prev) => ({
      ...prev,
      photoUri: media.audioArtworkUri,
      photoName: "Album Artwork",
    }));
    track("photo_selected", { source: "audio_artwork" });
  }, [media.audioArtworkUri, track]);

  const handleAdd = useCallback(() => {
    if (!media.photoUri || !media.audioUri) return;
    navigateToEditor(media);
  }, [media, navigateToEditor]);

  const resetPickerState = useCallback(() => {
    setMedia({
      photoUri: null,
      photoName: null,
      audioUri: null,
      audioName: null,
      audioArtworkUri: null,
    });
    setLoadingTarget(null);
    setContentHeight(0);
  }, []);

  const handleCancel = useCallback(() => {
    if (returnToEditor) {
      router.replace({
        pathname: "/create/editor" as const,
        params: {
          projectId: projectId ?? "",
          localProjectId: localProjectId ?? "",
          title: title ?? "",
          photoUri: firstParam(params.photoUri) ?? "",
          photoName: firstParam(params.photoName) ?? "",
          audioUri: firstParam(params.audioUri) ?? "",
          audioName: firstParam(params.audioName) ?? "",
          aspectRatio: aspectRatio ?? preferredAspectRatio,
          templateId,
          trimStart: trimStart ?? "0",
          trimEnd: trimEnd ?? String(DEFAULT_NEW_PROJECT_TRIM_END),
          templateTweaks: serializedTemplateTweaks,
          showTemplateInfo: showTemplateInfoParam === "1" ? "1" : "0",
        },
      });
      return;
    }

    resetPickerState();
    router.replace("/" as const);
  }, [
    returnToEditor,
    resetPickerState,
    router,
    projectId,
    localProjectId,
    title,
    params.photoUri,
    params.photoName,
    params.audioUri,
    params.audioName,
    aspectRatio,
    templateId,
    preferredAspectRatio,
    trimStart,
    trimEnd,
    serializedTemplateTweaks,
    showTemplateInfoParam,
  ]);

  const bothSelected = !!media.photoUri && !!media.audioUri;
  const showArtworkQuickFill = !media.photoUri && !!media.audioArtworkUri;
  const isPickingPhoto = loadingTarget === "photo";
  const isPickingAudio = loadingTarget === "audio";
  const activeAspectRatio = aspectRatio ?? preferredAspectRatio;
  const dockOverlayCompensation = tabEmbedded ? 82 : 0;
  const contentSidePadding = spacing.md;
  const contentHorizontalPadding = contentSidePadding * 2;
  const contentTopPadding = spacing.md;
  const contentBottomPadding = spacing.lg + dockOverlayCompensation;
  const cardGap = spacing.md;
  const availableWidth = Math.max(0, windowWidth - contentHorizontalPadding);
  const availableHeight = Math.max(
    0,
    contentHeight - contentTopPadding - contentBottomPadding,
  );
  const availableHeightForSquares = Math.max(0, availableHeight - cardGap);
  const mediaCardHeight =
    contentHeight > 0
      ? availableHeightForSquares / 2
      : 0;
  const mediaCardStyle =
    mediaCardHeight > 0
      ? { width: availableWidth, height: mediaCardHeight }
      : styles.squareCardPending;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {isFocused ? <StatusBar style="dark" /> : null}
      <View style={styles.header}>
        <Pressable
          onPress={handleCancel}
          style={styles.headerAction}
          accessibilityLabel="Cancel"
          accessibilityRole="button"
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>

        <Text style={styles.headerTitle}>Select Media</Text>

        <Pressable
          onPress={handleAdd}
          style={[styles.headerAction, styles.headerActionRight]}
          disabled={!bothSelected}
          accessibilityLabel={bothSelected ? "Continue to editor" : "Add media"}
          accessibilityRole="button"
          accessibilityState={{ disabled: !bothSelected }}
        >
          <Text style={[styles.addText, !bothSelected && styles.addTextDisabled]}>
            Add
          </Text>
        </Pressable>
      </View>

      {canUseNativePickerSummary && expoSwiftUI ? (
        <View style={styles.nativeSummaryWrap}>
          <expoSwiftUI.Host style={styles.nativeSummaryHost} colorScheme="light">
            <expoSwiftUI.Form>
              <expoSwiftUI.Section title="Selection">
                <expoSwiftUI.LabeledContent label="Audio">
                  <expoSwiftUI.Text>
                    {media.audioUri
                      ? (media.audioName ?? "Audio selected")
                      : "Not selected"}
                  </expoSwiftUI.Text>
                </expoSwiftUI.LabeledContent>
                <expoSwiftUI.LabeledContent label="Photo">
                  <expoSwiftUI.Text>
                    {media.photoUri
                      ? (media.photoName ?? "Photo selected")
                      : "Not selected"}
                  </expoSwiftUI.Text>
                </expoSwiftUI.LabeledContent>
              </expoSwiftUI.Section>
            </expoSwiftUI.Form>
          </expoSwiftUI.Host>
        </View>
      ) : null}

      <View
        style={[
          styles.content,
          {
            paddingHorizontal: contentSidePadding,
            paddingBottom: contentBottomPadding,
          },
        ]}
        onLayout={(event) => {
          const nextHeight = event.nativeEvent.layout.height;
          if (Math.abs(nextHeight - contentHeight) > 1) {
            setContentHeight(nextHeight);
          }
        }}
      >
        <View style={[styles.pickerCard, mediaCardStyle, styles.photoCard]}>
          {media.audioUri ? (
            <View style={styles.selectionWrap}>
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
              <View style={styles.selectionInfoRow}>
                <View style={styles.selectionTitleWrap}>
                  <Text style={styles.selectionLabel}>Selected Audio</Text>
                  <Text style={styles.selectionName} numberOfLines={1}>
                    {media.audioName ?? "Audio"}
                  </Text>
                </View>
                <Pressable
                  onPress={pickAudio}
                  style={styles.selectionAction}
                  disabled={isPickingPhoto || isPickingAudio}
                  accessibilityLabel="Change audio"
                  accessibilityRole="button"
                >
                  <Text style={styles.selectionActionText}>Change</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.pickArea,
                styles.pickAreaAudio,
                pressed && styles.pickAreaPressed,
              ]}
              onPress={pickAudio}
              disabled={isPickingPhoto || isPickingAudio}
              accessibilityLabel="Select an audio file"
              accessibilityRole="button"
            >
              {isPickingAudio ? (
                <ActivityIndicator color={colors.accent.primary} size="large" />
              ) : (
                <>
                  <View style={styles.pickIcon}>
                    <Ionicons
                      name="musical-note-outline"
                      size={34}
                      color={colors.accent.primary}
                    />
                  </View>
                  <Text style={styles.pickTitle}>Select Audio</Text>
                  <Text style={styles.pickHint}>MP3, WAV, or M4A files</Text>
                  <View style={styles.pickButton}>
                    <Text style={styles.pickButtonText}>Pick audio</Text>
                  </View>
                </>
              )}
            </Pressable>
          )}
        </View>

        <View style={[styles.pickerCard, mediaCardStyle]}>
          {media.photoUri ? (
            <View style={styles.selectionWrap}>
              <View style={styles.photoPreviewFrame}>
                <Image
                  source={{ uri: media.photoUri }}
                  style={styles.photoPreview}
                  accessibilityLabel="Selected photo"
                />
                <View style={styles.aspectRatioBadge}>
                  <Text style={styles.aspectRatioBadgeText}>{activeAspectRatio}</Text>
                </View>
              </View>
              <View style={styles.selectionInfoRow}>
                <View style={styles.selectionTitleWrap}>
                  <Text style={styles.selectionLabel}>Selected Photo</Text>
                  <Text style={styles.selectionName} numberOfLines={1}>
                    {media.photoName ?? "Photo"}
                  </Text>
                </View>
                <Pressable
                  onPress={pickPhoto}
                  style={styles.selectionAction}
                  disabled={isPickingPhoto || isPickingAudio}
                  accessibilityLabel="Change photo"
                  accessibilityRole="button"
                >
                  <Text style={styles.selectionActionText}>Change</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.pickAreaWrap}>
              <Pressable
                style={({ pressed }) => [
                  styles.pickArea,
                  pressed && styles.pickAreaPressed,
                ]}
                onPress={pickPhoto}
                disabled={isPickingPhoto || isPickingAudio}
                accessibilityLabel="Select a photo from camera roll"
                accessibilityRole="button"
              >
                {isPickingPhoto ? (
                  <ActivityIndicator color={colors.accent.primary} size="large" />
                ) : (
                  <>
                    <View style={styles.pickIcon}>
                      <Ionicons
                        name="image-outline"
                        size={34}
                        color={colors.accent.primary}
                      />
                    </View>
                    <Text style={styles.pickTitle}>Select Photo</Text>
                    <Text style={styles.pickHint}>
                      Choose an image from your library
                    </Text>
                    <View style={styles.pickButton}>
                      <Text style={styles.pickButtonText}>Pick a photo</Text>
                    </View>
                  </>
                )}
              </Pressable>

              {showArtworkQuickFill ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.quickFillCard,
                    pressed && styles.quickFillCardPressed,
                  ]}
                  onPress={handleUseArtworkAsPhoto}
                  disabled={isPickingPhoto || isPickingAudio}
                  accessibilityLabel="Use detected album artwork as cover image"
                  accessibilityRole="button"
                >
                  <Image
                    source={{ uri: media.audioArtworkUri ?? undefined }}
                    style={styles.quickFillArtwork}
                    accessibilityLabel="Detected album artwork"
                  />
                  <View style={styles.quickFillTextWrap}>
                    <Text style={styles.quickFillTitle}>Use album artwork</Text>
                    <Text style={styles.quickFillHint} numberOfLines={2}>
                      Reuse the track artwork as your photo in one tap.
                    </Text>
                  </View>
                  <Ionicons name="flash" size={18} color={colors.accent.primary} />
                </Pressable>
              ) : null}
            </View>
          )}
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
  headerTitle: {
    ...typography.button,
    color: colors.light.text,
    fontWeight: "700",
  },
  cancelText: {
    ...typography.body,
    color: colors.accent.primary,
  },
  addText: {
    ...typography.button,
    color: colors.accent.primary,
  },
  addTextDisabled: {
    opacity: 0.35,
  },
  nativeSummaryWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  nativeSummaryHost: {
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  squareCardPending: {
    width: "100%",
    flex: 1,
  },
  pickerCard: {
    width: "100%",
    borderRadius: IPHONE_EDGE_RADIUS,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#D5DBE5",
    backgroundColor: "#F9FAFC",
    padding: spacing.md,
    overflow: "hidden",
  },
  photoCard: {
    marginTop: spacing.xs,
  },
  pickAreaWrap: {
    flex: 1,
    gap: spacing.sm,
  },
  pickArea: {
    flex: 1,
    minHeight: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  pickAreaAudio: {
    paddingBottom: spacing.md,
  },
  pickAreaPressed: {
    opacity: 0.82,
  },
  pickIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: "#F3F6FB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.light.border,
  },
  pickTitle: {
    ...typography.h2,
    color: colors.light.text,
    marginBottom: spacing.xs,
    fontSize: 30,
    fontWeight: "700",
    textAlign: "center",
  },
  pickHint: {
    ...typography.body,
    color: colors.light.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  pickButton: {
    minHeight: 44,
    minWidth: 156,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3A80EC",
  },
  pickButtonText: {
    ...typography.button,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  selectionWrap: {
    flex: 1,
    overflow: "hidden",
    borderRadius: IPHONE_EDGE_RADIUS - spacing.sm,
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.light.border,
  },
  photoPreview: {
    flex: 1,
    width: "100%",
    minHeight: 0,
  },
  photoPreviewFrame: {
    flex: 1,
    minHeight: 0,
    position: "relative",
  },
  aspectRatioBadge: {
    position: "absolute",
    right: spacing.sm,
    bottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
  },
  aspectRatioBadgeText: {
    ...typography.caption,
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  audioThumb: {
    flex: 1,
    width: "100%",
    minHeight: 0,
    backgroundColor: "#EAF0FB",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  audioArtwork: {
    width: "100%",
    height: "100%",
  },
  selectionInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    padding: spacing.md,
  },
  selectionTitleWrap: {
    flex: 1,
    gap: 2,
  },
  selectionLabel: {
    ...typography.caption,
    color: colors.light.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  selectionName: {
    ...typography.body,
    color: colors.light.text,
    fontWeight: "600",
  },
  selectionAction: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: "#EEF3FC",
    alignItems: "center",
    justifyContent: "center",
  },
  selectionActionText: {
    ...typography.caption,
    color: colors.accent.primary,
    fontWeight: "700",
  },
  quickFillCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(88,86,214,0.35)",
    backgroundColor: "rgba(88,86,214,0.08)",
    padding: spacing.sm,
  },
  quickFillCardPressed: {
    opacity: 0.88,
  },
  quickFillArtwork: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
  },
  quickFillTextWrap: {
    flex: 1,
    gap: 2,
  },
  quickFillTitle: {
    ...typography.caption,
    color: colors.accent.primary,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  quickFillHint: {
    ...typography.caption,
    color: colors.light.text,
    lineHeight: 17,
  },
});
