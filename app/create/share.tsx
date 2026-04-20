import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  AppState,
  Linking,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { usePostHog } from "posthog-react-native";
import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";
import { colors, typography, spacing, radius } from "@/constants/tokens";
import { TemplateInfoBadge } from "@/components/create/TemplateInfoBadge";
import type { EventName } from "@/lib/analytics";
import { decodeUriParam } from "@/lib/uri";
import { normalizeMediaUri } from "@/lib/mediaUri";
import {
  getTemplateDefinition,
  normalizeTemplateTweaks,
  parseTemplateTweaksParam,
  resolveTemplateId,
} from "@/lib/templates";

function firstParam(param: string | string[] | undefined) {
  return Array.isArray(param) ? param[0] : param;
}

export default function ShareScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const params = useLocalSearchParams<{
    videoUri: string;
    projectId: string;
    posterUri?: string;
    templateId?: string;
    templateTweaks?: string;
    aspectRatio?: string;
    showTemplateInfo?: string;
  }>();
  const videoUri = normalizeMediaUri(decodeUriParam(firstParam(params.videoUri)));
  const posterUri = normalizeMediaUri(decodeUriParam(firstParam(params.posterUri)));
  const templateId = resolveTemplateId(firstParam(params.templateId));
  const parsedTemplateTweaks = parseTemplateTweaksParam(
    firstParam(params.templateTweaks),
  );
  const templateTweaks = parsedTemplateTweaks ?? normalizeTemplateTweaks();
  const templateDefinition = getTemplateDefinition(templateId);
  const TemplateStageComponent = templateDefinition.StageComponent;
  const aspectRatio = firstParam(params.aspectRatio) === "1:1" ? "1:1" : "9:16";
  const showTemplateInfo = firstParam(params.showTemplateInfo) === "1";

  // Compute large preview dimensions based on aspect ratio
  const horizontalPadding = spacing.md * 2;
  const maxPreviewWidth = windowWidth - horizontalPadding;
  const maxPreviewHeight = windowHeight * 0.50;

  const widthToHeightRatio =
    aspectRatio === "9:16" ? 16 / 9 : aspectRatio === "4:5" ? 5 / 4 : 1;
  const previewWidth =
    aspectRatio === "1:1"
      ? Math.min(maxPreviewWidth, maxPreviewHeight)
      : Math.min(maxPreviewHeight / widthToHeightRatio, maxPreviewWidth);
  const previewHeight = previewWidth * widthToHeightRatio;

  const [savedToRoll, setSavedToRoll] = useState(false);
  const [saveError, setSaveError] = useState<"permission" | "failed" | null>(
    null,
  );
  const saveErrorRef = useRef(saveError);
  saveErrorRef.current = saveError;

  const track = useCallback(
    (event: EventName, props?: Record<string, string>) => {
      posthog?.capture(event, props);
    },
    [posthog],
  );

  const saveVideo = useCallback(async () => {
    if (!videoUri) return;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        setSaveError("permission");
        return;
      }
      await MediaLibrary.saveToLibraryAsync(videoUri);
      setSavedToRoll(true);
      setSaveError(null);
      track("video_saved_to_camera_roll");
    } catch {
      setSaveError("failed");
    }
  }, [videoUri, track]);

  useEffect(() => {
    saveVideo();
  }, [saveVideo]);

  // Retry saving when the user returns from the Settings app after granting permission
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && saveErrorRef.current === "permission") {
        void saveVideo();
      }
    });
    return () => sub.remove();
  }, [saveVideo]);

  const handleShare = useCallback(async (platform: "instagram" | "tiktok") => {
    track(
      platform === "instagram"
        ? "share_tapped_instagram"
        : "share_tapped_tiktok",
    );
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert("Sharing not available", "Sharing is not supported on this device.");
        return;
      }
      await Sharing.shareAsync(videoUri, {
        mimeType: "video/mp4",
        UTI: "public.movie",
      });
    } catch {
      Alert.alert("Share failed", "Could not open sharing. Please try again.");
    }
  }, [videoUri, track]);

  const handleShareInstagram = useCallback(() => {
    void handleShare("instagram");
  }, [handleShare]);

  const handleDone = useCallback(() => {
    router.replace("/" as const);
  }, [router]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={handleDone}
          style={styles.headerButton}
          accessibilityLabel="Close and return home"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={24} color={colors.dark.text} />
        </Pressable>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Top info section */}
        <View style={styles.infoSection}>
          <Text style={styles.heading}>Ready to share</Text>
          {savedToRoll && (
            <View style={styles.savedBadge}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={colors.accent.success}
              />
              <Text style={styles.savedText}>
                This video was saved to your camera roll.
              </Text>
            </View>
          )}
          {saveError === "permission" && (
            <Pressable
              style={styles.savedBadge}
              onPress={() => void Linking.openSettings()}
              accessibilityRole="button"
              accessibilityLabel="Open Settings to grant Photos access"
            >
              <Ionicons
                name="alert-circle"
                size={16}
                color={colors.accent.warning}
              />
              <Text style={styles.savedText}>
                Permission denied. Tap to open Settings.
              </Text>
            </Pressable>
          )}
          {saveError === "failed" && (
            <View style={styles.savedBadge}>
              <Ionicons
                name="alert-circle"
                size={16}
                color={colors.accent.warning}
              />
              <Text style={styles.savedText}>
                Could not save to camera roll.
              </Text>
            </View>
          )}
        </View>

        {/* Video preview - takes up most of the space */}
        <View style={[styles.previewWrapper, { height: previewHeight }]}>
          <View
            style={[
              styles.previewContainer,
              { width: previewWidth, height: previewHeight },
            ]}
          >
            {posterUri ? (
              <TemplateStageComponent
                width={previewWidth}
                height={previewHeight}
                aspectRatio={aspectRatio}
                photoUri={posterUri}
                isPlaying={false}
                playbackLabel="Share preview"
                trackTitle="Preview"
                subtitle={templateDefinition.name}
                templateTweaks={templateTweaks}
                showWatermark={templateTweaks?.showWatermark ?? true}
              />
            ) : (
              <Ionicons
                name="videocam"
                size={48}
                color={colors.dark.textSecondary}
              />
            )}
            {showTemplateInfo ? (
              <TemplateInfoBadge
                templateId={templateId}
                templateTweaks={templateTweaks}
                aspectRatio={aspectRatio}
                compact
                style={styles.shareTemplateInfoBadge}
              />
            ) : null}
          </View>
        </View>
      </View>

      {/* Bottom actions */}
      <View style={styles.footer}>
        <View style={styles.actions}>
          <Pressable
            onPress={handleShareInstagram}
            style={({ pressed }) => [
              styles.shareButton,
              pressed && styles.buttonPressed,
            ]}
            accessibilityLabel="Share video"
            accessibilityRole="button"
          >
            <Ionicons name="share-social" size={20} color={colors.dark.background} />
            <Text style={styles.shareText}>Share</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={handleDone}
          style={({ pressed }) => [
            styles.doneButton,
            pressed && styles.buttonPressed,
          ]}
          accessibilityLabel="Done, return to home"
          accessibilityRole="button"
        >
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    backgroundColor: colors.dark.surface,
  },
  headerSpacer: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  infoSection: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  heading: {
    ...typography.h1,
    color: colors.dark.text,
    marginBottom: spacing.sm,
  },
  previewWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xxl,
  },
  previewContainer: {
    borderRadius: radius.lg,
    backgroundColor: "transparent",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    // Subtle glow effect
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  shareTemplateInfoBadge: {
    position: "absolute",
    left: spacing.xs,
    right: spacing.xs,
    bottom: spacing.xs,
  },
  savedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  savedText: {
    ...typography.caption,
    color: colors.dark.textSecondary,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.xl,
  },
  actions: {
    width: "100%",
    gap: spacing.md,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    backgroundColor: "#FFFFFF",
  },
  shareText: {
    ...typography.button,
    color: colors.dark.background,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  doneButton: {
    width: "100%",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.dark.surface,
  },
  doneText: {
    ...typography.button,
    color: colors.dark.text,
  },
});
