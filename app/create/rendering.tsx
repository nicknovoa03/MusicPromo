import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  initialWindowMetrics,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { usePostHog } from "posthog-react-native";
import { useConvexAuth, useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import Constants from "expo-constants";
import { isRunningInExpoGo } from "@/lib/runtimeEnvironment";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { colors, typography, spacing, radius } from "@/constants/tokens";
import { pressScaleStyle, PRESS_SCALE_SUBTLE } from "@/lib/pressFeedback";
import { TemplateInfoBadge } from "@/components/create/TemplateInfoBadge";
import type { EventName } from "@/lib/analytics";
import {
  cancelRendererWork,
  renderVideoWithRenderer,
  resolveRenderEngine,
  type RenderEngine,
} from "@/lib/rendering";
import { sleep } from "@/lib/utils";
import { decodeUriParam, encodeUriParam } from "@/lib/uri";
import { normalizeMediaUri } from "@/lib/mediaUri";
import {
  getTemplateDefinition,
  normalizeTemplateTweaks,
  parseTemplateTweaksParam,
  resolveTemplateId,
  serializeTemplateTweaksParam,
} from "@/lib/templates";

const STAGE_HORIZONTAL_PADDING = spacing.lg * 2;
const EXPORT_CONTENT_VERTICAL_OFFSET = 0;
const DEFAULT_TRIM_DURATION = 5;
const ENABLE_RENDER_MODE_BADGE = false;
const ENABLE_FAST_RENDER_MODE = false;
const FAST_EXPORT_DURATION_SECONDS: number | null = ENABLE_FAST_RENDER_MODE
  ? 3
  : null;

async function cancelCurrentRender(params: {
  engine?: RenderEngine;
  templateId?: string;
}): Promise<void> {
  if (isRunningInExpoGo()) return;
  try {
    await cancelRendererWork(params);
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
    Number.isFinite(end) && end > safeStart
      ? end
      : safeStart + DEFAULT_TRIM_DURATION;
  return [safeStart, safeEnd];
}

function displayMediaLabel(name: string, fallback: string) {
  const trimmed = name.trim();
  if (!trimmed) return fallback;
  return trimmed.replace(/\.[a-z0-9]{1,8}$/i, "");
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
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();
  const params = useLocalSearchParams<{
    projectId?: string;
    title?: string;
    templateId?: string;
    templateTweaks?: string;
    spinSpeed?: string;
    recordSize?: string;
    artworkScale?: string;
    recordTransparency?: string;
    stageBackgroundColor?: string;
    photoUri: string;
    photoName?: string;
    audioUri: string;
    audioName?: string;
    trimStart: string;
    trimEnd: string;
    aspectRatio: string;
    showTemplateInfo?: string;
  }>();

  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const createProject = useMutation(api.projects.create);
  const updateProject = useMutation(api.projects.update);
  const titleParam = firstParam(params.title);
  const audioNameParam = firstParam(params.audioName);
  const aspectRatioParam = firstParam(params.aspectRatio);
  const showTemplateInfoParam = firstParam(params.showTemplateInfo);
  const templateIdParam = firstParam(params.templateId);
  const templateTweaksParam = firstParam(params.templateTweaks);
  const spinSpeedParam = firstParam(params.spinSpeed);
  const recordSizeParam = firstParam(params.recordSize);
  const artworkScaleParam = firstParam(params.artworkScale);
  const recordTransparencyParam = firstParam(params.recordTransparency);
  const stageBackgroundColorParam = firstParam(params.stageBackgroundColor);
  const photoUriParam = firstParam(params.photoUri);

  const projectTitle = titleParam?.trim() || audioNameParam?.trim() || "New Project";
  const audioName = audioNameParam || "";
  const aspectRatio = aspectRatioParam === "1:1" ? "1:1" : "9:16";
  const showTemplateInfo = showTemplateInfoParam === "1";
  const templateId = resolveTemplateId(templateIdParam);
  const templateTweaks = useMemo(() => {
    const parsedTemplateTweaks = parseTemplateTweaksParam(templateTweaksParam);
    if (parsedTemplateTweaks) {
      return parsedTemplateTweaks;
    }
    return normalizeTemplateTweaks({
      spinSpeed: Number(spinSpeedParam),
      recordSize: Number.isFinite(Number(recordSizeParam))
        ? Number(recordSizeParam)
        : undefined,
      artworkScale: Number.isFinite(Number(artworkScaleParam))
        ? Number(artworkScaleParam)
        : undefined,
      recordTransparency: Number.isFinite(Number(recordTransparencyParam))
        ? Number(recordTransparencyParam)
        : undefined,
      stageBackgroundColor: stageBackgroundColorParam ?? undefined,
    });
  }, [
    templateTweaksParam,
    spinSpeedParam,
    recordSizeParam,
    artworkScaleParam,
    recordTransparencyParam,
    stageBackgroundColorParam,
  ]);
  const previewTemplateDefinition = getTemplateDefinition(templateId);
  const TemplateStageComponent = previewTemplateDefinition.StageComponent;
  const previewPhotoUri = useMemo(
    () => normalizeMediaUri(decodeUriParam(photoUriParam)),
    [photoUriParam],
  );
  const trackTitle = displayMediaLabel(audioName, "Untitled track");
  const stageWidthRatio = aspectRatio === "9:16" ? 9 / 16 : aspectRatio === "4:5" ? 4 / 5 : 1;
  const maxStageWidth = Math.min(windowWidth - STAGE_HORIZONTAL_PADDING, 440);
  const fallbackTopInset = Math.max(
    initialWindowMetrics?.insets.top ?? 0,
    Constants.statusBarHeight ?? 0,
  );
  const fallbackBottomInset = initialWindowMetrics?.insets.bottom ?? 0;
  const stableTopInset = Math.max(insets.top, fallbackTopInset);
  const stableBottomInset = Math.max(insets.bottom, fallbackBottomInset);
  const reservedVerticalSpace =
    stableTopInset +
    stableBottomInset +
    EXPORT_CONTENT_VERTICAL_OFFSET +
    48 + // header row
    32 + // "Exporting" label + top margin
    88 + // large percentage text + margin
    52 + // bottom message block
    spacing.lg; // content bottom padding
  const maxStageHeight = Math.max(
    220,
    Math.min(windowHeight * 0.64, windowHeight - reservedVerticalSpace),
  );
  const stageWidth = Math.min(maxStageWidth, maxStageHeight * stageWidthRatio);
  const stageHeight = stageWidth / stageWidthRatio;

  const [progress, setProgress] = useState(0);
  const [renderState, setRenderState] = useState<RenderState>("rendering");
  const [errorMessage, setErrorMessage] = useState("");
  const projectIdRef = useRef<Id<"projects"> | null>(null);
  const hasStarted = useRef(false);
  const isScreenActiveRef = useRef(true);
  const isCanceledRef = useRef(false);
  const activeEngineRef = useRef<RenderEngine>(resolveRenderEngine({ templateId }));
  const activeTemplateIdRef = useRef<string>(templateId);

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
      void cancelCurrentRender({
        engine: activeEngineRef.current,
        templateId: activeTemplateIdRef.current,
      });
    };
  }, []);

  const startRender = useCallback(async () => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    isCanceledRef.current = false;

    const existingProjectId = asProjectId(firstParam(params.projectId));
    const title = firstParam(params.title);
    const photoUri = normalizeMediaUri(decodeUriParam(firstParam(params.photoUri)));
    const photoName = firstParam(params.photoName) || undefined;
    const audioUri = normalizeMediaUri(decodeUriParam(firstParam(params.audioUri)));
    const audioName = firstParam(params.audioName) || undefined;
    const parsedTrimStart = Number(firstParam(params.trimStart));
    const parsedTrimEnd = Number(firstParam(params.trimEnd));
    const [trimStart, trimEnd] = normalizeTrimBounds(parsedTrimStart, parsedTrimEnd);
    const renderTrimEnd =
      FAST_EXPORT_DURATION_SECONDS === null
        ? trimEnd
        : Math.min(trimEnd, trimStart + FAST_EXPORT_DURATION_SECONDS);
    const aspectRatio =
      firstParam(params.aspectRatio) === "1:1" ? "1:1" : "9:16";
    const showTemplateInfo = firstParam(params.showTemplateInfo) === "1";
    const templateId = resolveTemplateId(firstParam(params.templateId));
    const parsedTemplateTweaks = parseTemplateTweaksParam(
      firstParam(params.templateTweaks),
    );
    const templateTweaks = parsedTemplateTweaks
      ? parsedTemplateTweaks
      : normalizeTemplateTweaks({
          spinSpeed: Number(firstParam(params.spinSpeed)),
          recordSize: Number.isFinite(Number(firstParam(params.recordSize)))
            ? Number(firstParam(params.recordSize))
            : undefined,
          artworkScale: Number.isFinite(Number(firstParam(params.artworkScale)))
            ? Number(firstParam(params.artworkScale))
            : undefined,
          recordTransparency: Number.isFinite(Number(firstParam(params.recordTransparency)))
            ? Number(firstParam(params.recordTransparency))
            : undefined,
          stageBackgroundColor:
            firstParam(params.stageBackgroundColor) ?? undefined,
        });
    const serializedTemplateTweaks = serializeTemplateTweaksParam(templateTweaks);
    const selectedEngine = resolveRenderEngine({ templateId });
    activeEngineRef.current = selectedEngine;
    activeTemplateIdRef.current = templateId;

    track("video_export_started", {
      aspectRatio,
      engine: selectedEngine,
      templateId,
    });

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
            photoName,
            audioUri,
            audioName,
            trimStart,
            trimEnd,
            templateId,
            templateTweaks: serializedTemplateTweaks,
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
      if (isRunningInExpoGo()) {
        throw new Error(
          "Video rendering requires a development build.\n\nIt cannot run in Expo Go. Run 'npx expo run:android' or 'npx expo run:ios' to test.",
        );
      }

      const renderResult = await renderVideoWithRenderer({
        engine: selectedEngine,
        templateId,
        templateTweaks,
        photoUri,
        audioUri,
        trimStart,
        trimEnd: renderTrimEnd,
        aspectRatio,
        debugRenderModeBadge: ENABLE_RENDER_MODE_BADGE,
        fastMode: ENABLE_FAST_RENDER_MODE,
        outputFileName: title?.trim() || audioName?.trim() || "MusicPromo Export",
        onProgress: (percent) => {
          setProgress(percent);
        },
      });
      const videoUri = renderResult.videoUri;

      if (!isScreenActiveRef.current || isCanceledRef.current) return;

      setProgress(100);
      setRenderState("complete");
      track("video_exported", {
        engine: renderResult.engine,
        templateId: renderResult.templateId,
      });

      if (projectIdRef.current) {
        try {
          await updateProject({
            projectId: projectIdRef.current,
            title: title?.trim() || "New Project",
            templateId,
            templateTweaks: serializedTemplateTweaks,
            aspectRatio,
            photoUri,
            photoName,
            audioUri,
            audioName,
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
          videoUri: encodeUriParam(videoUri),
          projectId: projectIdRef.current ?? "",
          posterUri: encodeUriParam(photoUri),
          templateId,
          templateTweaks: serializedTemplateTweaks,
          aspectRatio,
          showTemplateInfo: showTemplateInfo ? "1" : "0",
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
            void cancelCurrentRender({
              engine: activeEngineRef.current,
              templateId: activeTemplateIdRef.current,
            });
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
  const stagePreview = useMemo(
    () => (
      <View style={styles.stageWrap}>
        <View style={[styles.stageFrame, { width: stageWidth, height: stageHeight }]}>
          <TemplateStageComponent
            width={stageWidth}
            height={stageHeight}
            aspectRatio={aspectRatio}
            photoUri={previewPhotoUri}
            isPlaying={renderState === "rendering"}
            playbackLabel="Now Playing"
            trackTitle={trackTitle}
            subtitle={projectTitle}
            templateTweaks={templateTweaks}
            showWatermark={templateTweaks.showWatermark}
          />
          {showTemplateInfo ? (
            <TemplateInfoBadge
              templateId={templateId}
              templateTweaks={templateTweaks}
              aspectRatio={aspectRatio}
              compact
              style={styles.stageTemplateInfoBadge}
            />
          ) : null}
        </View>
      </View>
    ),
    [
      TemplateStageComponent,
      stageWidth,
      stageHeight,
      aspectRatio,
      previewPhotoUri,
      renderState,
      trackTitle,
      projectTitle,
      templateTweaks,
      showTemplateInfo,
      templateId,
    ],
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: stableTopInset + spacing.xs }]}>
        <Pressable
          onPress={handleCancel}
          style={({ pressed }) => [
            styles.headerButton,
            pressScaleStyle(pressed, PRESS_SCALE_SUBTLE),
          ]}
          accessibilityLabel="Cancel export"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={24} color={colors.dark.text} />
        </Pressable>
        <View style={styles.headerSpacer} />
      </View>

      {/* Main content */}
      <View style={[styles.content, { paddingBottom: spacing.lg + stableBottomInset }]}>
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
                pressScaleStyle(pressed),
              ]}
              accessibilityLabel="Retry export"
              accessibilityRole="button"
            >
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.progressLabel}>Exporting</Text>
            <Text style={styles.percentageText}>{progress}%</Text>

            {stagePreview}

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
    paddingVertical: spacing.xs,
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
    justifyContent: "flex-start",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    marginTop: -EXPORT_CONTENT_VERTICAL_OFFSET,
  },
  progressLabel: {
    ...typography.caption,
    color: colors.dark.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  percentageText: {
    fontSize: 64,
    fontWeight: "800",
    color: colors.dark.text,
    fontVariant: ["tabular-nums"],
    marginBottom: spacing.md,
  },
  stageWrap: {
    width: "100%",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  stageFrame: {
    position: "relative",
  },
  stageTemplateInfoBadge: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
  },
  message: {
    ...typography.body,
    color: colors.dark.textSecondary,
    textAlign: "center",
    lineHeight: 22,
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
  retryText: {
    ...typography.button,
    color: "#FFFFFF",
  },
});
