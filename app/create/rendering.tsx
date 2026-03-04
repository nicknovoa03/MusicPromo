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
import { useConvexAuth, useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import Constants from "expo-constants";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { colors, typography, spacing, radius } from "@/constants/tokens";
import type { EventName } from "@/lib/analytics";
import { cancelRendererWork, renderVideoWithRenderer } from "@/lib/rendering";
import { sleep } from "@/lib/utils";

function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

const PREVIEW_SIZE = 220;

async function cancelCurrentRender(): Promise<void> {
  if (isExpoGo()) return;
  try {
    await cancelRendererWork("ffmpeg");
  } catch {
    // Ignore
  }
}

type RenderState = "rendering" | "complete" | "error";

function firstParam(param: string | string[] | undefined) {
  return Array.isArray(param) ? param[0] : param;
}

function normalizeTrimBounds(start: number, end: number): [number, number] {
  const safeStart = Number.isFinite(start) ? Math.max(0, start) : 0;
  const safeEnd =
    Number.isFinite(end) && end > safeStart ? end : safeStart + 30;
  return [safeStart, safeEnd];
}

function asProjectId(value: string | undefined): Id<"projects"> | null {
  if (!value) return null;
  return value as Id<"projects">;
}

function isUnauthenticatedConvexError(error: unknown) {
  if (!(error instanceof ConvexError)) return false;
  if (!error.data || typeof error.data !== "object") return false;
  const code = (error.data as { code?: unknown }).code;
  return code === "UNAUTHENTICATED";
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

  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const createProject = useMutation(api.projects.create);
  const updateProject = useMutation(api.projects.update);

  const [progress, setProgress] = useState(0);
  const [renderState, setRenderState] = useState<RenderState>("rendering");
  const [errorMessage, setErrorMessage] = useState("");
  const projectIdRef = useRef<Id<"projects"> | null>(null);
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const hasStarted = useRef(false);
  const isScreenActiveRef = useRef(true);
  const isCanceledRef = useRef(false);

  const track = useCallback(
    (event: EventName, props?: Record<string, string>) => {
      posthog?.capture(event, props);
    },
    [posthog],
  );

  useEffect(() => {
    return () => {
      isScreenActiveRef.current = false;
      isCanceledRef.current = true;
      void cancelCurrentRender();
    };
  }, []);

  const startRender = useCallback(async () => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    isCanceledRef.current = false;

    const existingProjectId = asProjectId(firstParam(params.projectId));
    const title = firstParam(params.title);
    const photoUri = firstParam(params.photoUri) ?? "";
    const audioUri = firstParam(params.audioUri) ?? "";
    const parsedTrimStart = Number(firstParam(params.trimStart));
    const parsedTrimEnd = Number(firstParam(params.trimEnd));
    const [trimStart, trimEnd] = normalizeTrimBounds(parsedTrimStart, parsedTrimEnd);
    const aspectRatio =
      firstParam(params.aspectRatio) === "1:1" ? "1:1" : "9:16";

    track("video_export_started", { aspectRatio });

    if (!projectIdRef.current && existingProjectId) {
      projectIdRef.current = existingProjectId;
    }

    if (!projectIdRef.current && isAuthenticated) {
      const tryCreate = async (retries = 1): Promise<void> => {
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
          projectIdRef.current = projectId;
        } catch (err) {
          const msg = err instanceof Error ? err.message : "";
          if (isUnauthenticatedConvexError(err) && retries > 0) {
            await sleep(800);
            return tryCreate(retries - 1);
          }
          track("project_create_failed_during_export", {
            error: msg.slice(0, 200) || "unknown_error",
          });
          // Non-fatal — project metadata save failure shouldn't block render
        }
      };
      await tryCreate();
    }

    try {
      if (isExpoGo()) {
        throw new Error(
          "Video rendering requires a development build.\n\nIt cannot run in Expo Go. Run 'npx expo run:android' or 'npx expo run:ios' to test.",
        );
      }

      const renderResult = await renderVideoWithRenderer({
        engine: "ffmpeg",
        templateId: "spinning-cd",
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
      const videoUri = renderResult.videoUri;

      if (!isScreenActiveRef.current || isCanceledRef.current) return;

      setProgress(100);
      setRenderState("complete");
      track("video_exported");

      if (projectIdRef.current) {
        try {
          await updateProject({
            projectId: projectIdRef.current,
            templateId: "spinning-cd",
            aspectRatio,
            photoUri,
            audioUri,
            trimStart,
            trimEnd,
            exportedVideoUri: videoUri,
            status: "exported",
          });
        } catch {
          // Non-fatal
        }
      }

      if (!isScreenActiveRef.current || isCanceledRef.current) return;

      router.replace({
        pathname: "/create/share",
        params: {
          videoUri,
          projectId: projectIdRef.current ?? "",
          posterUri: photoUri,
        },
      });
    } catch (err) {
      if (!isScreenActiveRef.current || isCanceledRef.current) return;

      const reason =
        err instanceof Error ? err.message : "Unknown rendering error";
      setRenderState("error");
      setErrorMessage(reason);
      if (!reason.toLowerCase().includes("canceled")) {
        track("video_export_failed", { error: reason.slice(0, 200) });
      }
    }
  }, [
    params,
    isAuthenticated,
    createProject,
    updateProject,
    track,
    router,
    animatedProgress,
  ]);

  useEffect(() => {
    if (isAuthLoading) return;
    startRender();
  }, [startRender, isAuthLoading]);

  const handleCancel = useCallback(() => {
    Alert.alert(
      "Cancel Export?",
      "Your video is still rendering. Are you sure you want to cancel?",
      [
        { text: "Keep Rendering", style: "cancel" },
        {
          text: "Cancel",
          style: "destructive",
          onPress: () => {
            isCanceledRef.current = true;
            void cancelCurrentRender();
            router.back();
          },
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
    outputRange: [0, PREVIEW_SIZE],
    extrapolate: "clamp",
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
                {firstParam(params.photoUri) ? (
                  <Image
                    source={{ uri: firstParam(params.photoUri) }}
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
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
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
