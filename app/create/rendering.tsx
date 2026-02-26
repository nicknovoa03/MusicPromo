import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Animated,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { usePostHog } from "posthog-react-native";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { colors, typography, spacing, radius } from "@/constants/tokens";
import { renderSpinningCdVideo } from "@/lib/renderVideo";
import type { EventName } from "@/lib/analytics";

type RenderState = "rendering" | "complete" | "error";

function firstParam(param: string | string[] | undefined) {
  return Array.isArray(param) ? param[0] : param;
}

export default function RenderingScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  const params = useLocalSearchParams<{
    projectId?: string;
    title?: string;
    photoUri: string;
    audioUri: string;
    trimStart: string;
    trimEnd: string;
    aspectRatio: string;
  }>();

  const createProject = useMutation(api.projects.create);
  const markExported = useMutation(api.projects.markExported);
  const updateProject = useMutation(api.projects.update);

  const [progress, setProgress] = useState(0);
  const [renderState, setRenderState] = useState<RenderState>("rendering");
  const [errorMessage, setErrorMessage] = useState("");
  const projectIdRef = useRef<string | null>(null);
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const hasStarted = useRef(false);

  const track = useCallback(
    (event: EventName, props?: Record<string, string>) => {
      posthog?.capture(event, props);
    },
    [posthog],
  );

  const startRender = useCallback(async () => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const existingProjectId = firstParam(params.projectId);
    const title = firstParam(params.title);
    const photoUri = firstParam(params.photoUri) ?? "";
    const audioUri = firstParam(params.audioUri) ?? "";
    const trimStart = Number(firstParam(params.trimStart));
    const trimEnd = Number(firstParam(params.trimEnd));
    const aspectRatio =
      firstParam(params.aspectRatio) === "1:1" ? "1:1" : "9:16";

    track("video_export_started", { aspectRatio });

    if (existingProjectId) {
      projectIdRef.current = existingProjectId;
    } else {
      try {
        const projectId = await createProject({
          title: title?.trim() || "New Project",
          aspectRatio,
          photoUri,
          audioUri,
          trimStart,
          trimEnd,
          templateId: "spinning-cd",
        });
        projectIdRef.current = projectId as string;
      } catch {
        // Non-fatal — project metadata save failure shouldn't block render
      }
    }

    try {
      const videoUri = await renderSpinningCdVideo({
        photoUri,
        audioUri,
        trimStart,
        trimEnd,
        aspectRatio,
        onProgress: (percent) => {
          setProgress(percent);
          Animated.timing(animatedProgress, {
            toValue: percent,
            duration: 300,
            useNativeDriver: false,
          }).start();
        },
      });

      setProgress(100);
      setRenderState("complete");
      track("video_exported");

      if (projectIdRef.current) {
        try {
          if (existingProjectId) {
            await updateProject({
              projectId: projectIdRef.current as never,
              templateId: "spinning-cd",
              aspectRatio,
              photoUri,
              audioUri,
              trimStart,
              trimEnd,
              exportedVideoUri: videoUri,
              status: "exported",
            });
          } else {
            await markExported({
              projectId: projectIdRef.current as never,
              exportedVideoUri: videoUri,
            });
          }
        } catch {
          // Non-fatal
        }
      }

      router.replace({
        pathname: "/create/share",
        params: { videoUri, projectId: projectIdRef.current ?? "" },
      });
    } catch (err) {
      const reason =
        err instanceof Error ? err.message : "Unknown rendering error";
      setRenderState("error");
      setErrorMessage(reason);
      track("video_export_failed", { error: reason.slice(0, 200) });
    }
  }, [
    params,
    createProject,
    markExported,
    updateProject,
    track,
    router,
    animatedProgress,
  ]);

  useEffect(() => {
    startRender();
  }, [startRender]);

  const handleCancel = useCallback(() => {
    Alert.alert(
      "Cancel Export?",
      "Your video is still rendering. Are you sure you want to cancel?",
      [
        { text: "Keep Rendering", style: "cancel" },
        {
          text: "Cancel",
          style: "destructive",
          onPress: () => router.back(),
        },
      ],
    );
  }, [router]);

  const handleRetry = useCallback(() => {
    setRenderState("rendering");
    setProgress(0);
    setErrorMessage("");
    hasStarted.current = false;
    startRender();
  }, [startRender]);

  const gradientBorderWidth = animatedProgress.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={handleCancel}
          style={styles.headerButton}
          accessibilityLabel="Cancel export"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={24} color={colors.dark.text} />
        </Pressable>
        <View style={styles.headerSpacer} />
      </View>

      {/* Main content */}
      <View style={styles.content}>
        {renderState === "error" ? (
          <View style={styles.errorContainer}>
            <Ionicons
              name="alert-circle"
              size={48}
              color={colors.accent.error}
            />
            <Text style={styles.errorTitle}>Rendering failed</Text>
            <Text style={styles.errorMessage} numberOfLines={3}>
              {errorMessage || "Something went wrong. Please try again."}
            </Text>
            <Pressable
              onPress={handleRetry}
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.retryButtonPressed,
              ]}
              accessibilityLabel="Retry export"
              accessibilityRole="button"
            >
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Percentage */}
            <Text style={styles.percentageText}>{progress}%</Text>

            {/* Preview with gradient border */}
            <View style={styles.previewWrapper}>
              <View style={styles.gradientBorder}>
                <Animated.View
                  style={[styles.gradientFill, { width: gradientBorderWidth }]}
                />
              </View>
              <View style={styles.previewInner}>
                {params.photoUri ? (
                  <Image
                    source={{ uri: params.photoUri }}
                    style={styles.previewImage}
                    resizeMode="cover"
                    accessibilityLabel="Video preview"
                  />
                ) : (
                  <Ionicons
                    name="videocam-outline"
                    size={48}
                    color={colors.dark.textSecondary}
                  />
                )}
              </View>
            </View>

            {/* Message */}
            <Text style={styles.message}>
              Please don't close the app{"\n"}or lock your screen.
            </Text>
          </>
        )}
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
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  percentageText: {
    fontSize: 72,
    fontWeight: "800",
    color: colors.dark.text,
    fontVariant: ["tabular-nums"],
    marginBottom: spacing.xl,
  },
  previewWrapper: {
    width: 220,
    height: 220,
    borderRadius: radius.lg + 4,
    padding: 3,
    overflow: "hidden",
    backgroundColor: colors.dark.surface,
    marginBottom: spacing.xl,
  },
  gradientBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg + 4,
    overflow: "hidden",
    backgroundColor: colors.dark.surface,
  },
  gradientFill: {
    height: "100%",
    backgroundColor: colors.accent.primary,
    opacity: 0.6,
  },
  previewInner: {
    flex: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.dark.background,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  previewImage: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
  },
  message: {
    ...typography.body,
    color: colors.dark.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  errorContainer: {
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  errorTitle: {
    ...typography.h2,
    color: colors.dark.text,
  },
  errorMessage: {
    ...typography.body,
    color: colors.dark.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  retryButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.accent.primary,
  },
  retryButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  retryText: {
    ...typography.button,
    color: "#FFFFFF",
  },
});
