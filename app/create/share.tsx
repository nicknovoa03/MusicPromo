import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
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
  const { height: windowHeight } = useWindowDimensions();
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
  const isCompactHeight = windowHeight < 760;
  const previewSize = isCompactHeight ? 152 : 184;

  const [savedToRoll, setSavedToRoll] = useState(false);
  const [saveError, setSaveError] = useState<"permission" | "failed" | null>(
    null,
  );

  const track = useCallback(
    (event: EventName, props?: Record<string, string>) => {
      posthog?.capture(event, props);
    },
    [posthog],
  );

  useEffect(() => {
    async function saveVideo() {
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
    }
    saveVideo();
  }, [videoUri, track]);

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

  const handleShareTikTok = useCallback(() => {
    void handleShare("tiktok");
  }, [handleShare]);

  const handleDone = useCallback(() => {
    router.dismissAll();
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
      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.heading, isCompactHeight && styles.headingCompact]}>
          Ready to share
        </Text>

        {/* Save status */}
        {savedToRoll && (
          <View style={styles.savedBadge}>
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={colors.accent.success}
            />
            <Text style={styles.savedText}>
              This video was saved to your camera roll.
            </Text>
          </View>
        )}
        {saveError === "permission" && (
          <View style={styles.savedBadge}>
            <Ionicons
              name="alert-circle"
              size={18}
              color={colors.accent.warning}
            />
            <Text style={styles.savedText}>
              Permission denied. Grant Photos access in Settings.
            </Text>
          </View>
        )}
        {saveError === "failed" && (
          <View style={styles.savedBadge}>
            <Ionicons
              name="alert-circle"
              size={18}
              color={colors.accent.warning}
            />
            <Text style={styles.savedText}>
              Could not save to camera roll.
            </Text>
          </View>
        )}

        {/* Video preview */}
        <View
          style={[
            styles.previewContainer,
            isCompactHeight && styles.previewContainerCompact,
          ]}
        >
          {posterUri ? (
            <TemplateStageComponent
              width={previewSize}
              height={previewSize}
              aspectRatio={aspectRatio}
              photoUri={posterUri}
              isPlaying={false}
              playbackLabel="Share preview"
              trackTitle="Preview"
              subtitle={templateDefinition.name}
              templateTweaks={templateTweaks}
              showWatermark={false}
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

        {/* Share buttons */}
        <View style={styles.actions}>
          <Pressable
            onPress={handleShareInstagram}
            style={({ pressed }) => [
              styles.instagramButton,
              pressed && styles.buttonPressed,
            ]}
            accessibilityLabel="Share to Instagram"
            accessibilityRole="button"
          >
            <Ionicons name="logo-instagram" size={20} color="#FFFFFF" />
            <Text style={styles.instagramText}>Share to Instagram</Text>
          </Pressable>

          <Pressable
            onPress={handleShareTikTok}
            style={({ pressed }) => [
              styles.tiktokButton,
              pressed && styles.buttonPressed,
            ]}
            accessibilityLabel="Share to TikTok"
            accessibilityRole="button"
          >
            <Ionicons name="musical-notes" size={20} color={colors.dark.text} />
            <Text style={styles.tiktokText}>Share to TikTok</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Done button */}
      <View style={styles.footer}>
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
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  contentScroll: {
    flex: 1,
  },
  heading: {
    ...typography.h1,
    color: colors.dark.text,
    marginBottom: spacing.sm,
  },
  headingCompact: {
    marginBottom: spacing.xs,
  },
  savedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  savedText: {
    ...typography.caption,
    color: colors.dark.textSecondary,
  },
  previewContainer: {
    width: 200,
    height: 200,
    borderRadius: radius.lg,
    backgroundColor: "transparent",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
    position: "relative",
  },
  previewContainerCompact: {
    width: 168,
    height: 168,
    marginBottom: spacing.md,
  },
  shareTemplateInfoBadge: {
    position: "absolute",
    left: spacing.xs,
    right: spacing.xs,
    bottom: spacing.xs,
  },
  actions: {
    width: "100%",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  instagramButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.instagram.mid,
  },
  instagramText: {
    ...typography.button,
    color: "#FFFFFF",
  },
  tiktokButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.dark.surface,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  tiktokText: {
    ...typography.button,
    color: colors.dark.text,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  doneButton: {
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
