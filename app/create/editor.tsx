import { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  Image,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  type LayoutChangeEvent,
} from "react-native";
import {
  SafeAreaView,
  initialWindowMetrics,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import Constants from "expo-constants";
import Ionicons from "@expo/vector-icons/Ionicons";
import { usePostHog } from "posthog-react-native";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import * as FileSystem from "expo-file-system/legacy";
import { Audio, type AVPlaybackStatus } from "expo-av";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { colors, typography, spacing, radius } from "@/constants/tokens";
import { AudioTrimmer } from "@/components/create/AudioTrimmer";
import { type AspectRatio } from "@/components/create/AspectRatioToggle";
import { TemplateCustomizeModal } from "@/components/create/TemplateCustomizeModal";
import { TemplateInfoBadge } from "@/components/create/TemplateInfoBadge";
import type { EventName } from "@/lib/analytics";
import { decodeUriParam, encodeUriParam, fileNameFromUri } from "@/lib/uri";
import { normalizeMediaUri } from "@/lib/mediaUri";
import { sleep } from "@/lib/utils";
import { useLocalSession } from "@/providers/localSession";
import { upsertLocalProject } from "@/lib/localProjects";
import {
  getCachedTemplateTweaks,
  setCachedTemplateTweaks,
} from "@/lib/templateTweaksCache";
import {
  DEFAULT_TEMPLATE_TWEAKS,
  getTemplateDefinition,
  listTemplateDefinitions,
  normalizeTemplateTweaks,
  parseTemplateTweaksParam,
  resolveTemplateId,
  serializeTemplateTweaksParam,
  type TemplateTweaks,
} from "@/lib/templates";
import {
  getIOSNativeUIPhase5Availability,
  loadExpoSwiftUIModule,
} from "@/lib/iosNativeUi";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const STAGE_HORIZONTAL_PADDING = spacing.xs * 2;
const FALLBACK_AUDIO_DURATION = 180;
const DEFAULT_TRIM_DURATION = 5;
const DEFAULT_PROJECT_TITLE = "New Project";
const NATIVE_ASPECT_RATIO_OPTIONS: AspectRatio[] = ["9:16", "1:1"];
const TRIM_PANEL_ANIMATION_DURATION_MS = 260;
const TRIM_PANEL_MAX_HEIGHT = Math.max(260, Math.round(SCREEN_HEIGHT * 0.44));
const audioDurationSecCache = new Map<string, number>();

type MissingFilesState = {
  photo: boolean;
  audio: boolean;
};

function firstParam(param: string | string[] | undefined) {
  return Array.isArray(param) ? param[0] : param;
}

function parseNumberParam(
  value: string | string[] | undefined,
  fallback: number,
) {
  const parsed = Number(firstParam(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseAspectRatioParam(
  value: string | string[] | undefined,
): AspectRatio {
  return firstParam(value) === "1:1" ? "1:1" : "9:16";
}

function parseShowTemplateInfoParam(
  value: string | string[] | undefined,
): boolean {
  return firstParam(value) === "1";
}

function asProjectId(value?: string) {
  if (!value) return null;
  return value as Id<"projects">;
}

function isUnauthenticatedConvexError(error: unknown) {
  if (!(error instanceof ConvexError)) return false;
  if (!error.data || typeof error.data !== "object") return false;
  const code = (error.data as { code?: unknown }).code;
  return code === "UNAUTHENTICATED";
}

function isTemplateTweaksValidationError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message || "";
  return (
    message.includes("ArgumentValidationError") &&
    message.includes("templateTweaks")
  );
}

function isGeneratedMediaName(value: string) {
  return /^media-\d+-\d+(\.[a-z0-9]{1,8})?$/i.test(value.trim());
}

function fallbackMediaNameFromUri(uri: string, fallback: "Photo" | "Audio") {
  const fromUri = fileNameFromUri(uri);
  if (!fromUri || isGeneratedMediaName(fromUri)) return fallback;
  return fromUri;
}

function displayMediaLabel(name: string, fallback: string) {
  const trimmed = name.trim();
  if (!trimmed) return fallback;
  return trimmed.replace(/\.[a-z0-9]{1,8}$/i, "");
}

async function isMissingFile(uri?: string) {
  const normalizedUri = normalizeMediaUri(uri);
  if (!normalizedUri) return true;
  if (!normalizedUri.startsWith("file://")) return false;

  try {
    const info = await FileSystem.getInfoAsync(normalizedUri);
    if (info.exists) return false;
  } catch {
    // Fall through to loader-based checks below.
  }

  // Metadata checks can be wrong on some iOS sandboxed files.
  // Try actually loading media before declaring "missing".
  const isLikelyAudio = /\.(mp3|wav|m4a|aac|mp4)$/i.test(normalizedUri);
  if (isLikelyAudio) {
    const duration = await getAudioDurationSec(normalizedUri);
    return !(duration && Number.isFinite(duration) && duration > 0);
  }

  return await new Promise<boolean>((resolve) => {
    Image.getSize(
      normalizedUri,
      () => resolve(false),
      () => resolve(true),
    );
  });
}

async function getAudioDurationSec(uri: string): Promise<number | null> {
  const normalizedUri = normalizeMediaUri(uri);
  if (!normalizedUri) return null;
  const cachedDuration = audioDurationSecCache.get(normalizedUri);
  if (cachedDuration !== undefined) return cachedDuration;

  if (normalizedUri.startsWith("file://")) {
    try {
      const info = await FileSystem.getInfoAsync(normalizedUri);
      if (!info.exists) return null;
    } catch {
      return null;
    }
  }

  let sound: Audio.Sound | null = null;
  try {
    const created = await Audio.Sound.createAsync(
      { uri: normalizedUri },
      { shouldPlay: false },
      undefined,
      false,
    );
    sound = created.sound;
    const status = await sound.getStatusAsync();
    if (status.isLoaded && status.durationMillis) {
      const durationSec = status.durationMillis / 1000;
      audioDurationSecCache.set(normalizedUri, durationSec);
      return durationSec;
    }
    return null;
  } catch {
    return null;
  } finally {
    await sound?.unloadAsync();
  }
}

function clampTrimRange(
  start: number,
  end: number,
  durationSec: number,
  minDuration: number,
  maxDuration: number,
): [number, number] {
  const total = Number.isFinite(durationSec) ? Math.max(durationSec, 1) : 1;
  const safeMin = Math.max(1, Math.min(minDuration, total));
  const safeMax = Math.max(safeMin, Math.min(maxDuration, total));

  let nextStart = Math.max(0, Math.min(start, total));
  let nextEnd = Math.max(0, Math.min(end, total));

  if (nextEnd <= nextStart) {
    nextEnd = Math.min(nextStart + safeMin, total);
  }

  let span = nextEnd - nextStart;
  if (span < safeMin) {
    nextEnd = Math.min(nextStart + safeMin, total);
    nextStart = Math.max(0, nextEnd - safeMin);
    span = nextEnd - nextStart;
  }

  if (span > safeMax) {
    nextEnd = Math.min(nextStart + safeMax, total);
    nextStart = Math.max(0, nextEnd - safeMax);
  }

  return [nextStart, nextEnd];
}

function formatClock(seconds: number): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function EditorScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    source?: string;
    projectId?: string;
    localProjectId?: string;
    title?: string;
    photoUri?: string;
    photoName?: string;
    audioUri?: string;
    audioName?: string;
    aspectRatio?: AspectRatio;
    templateId?: string;
    templateTweaks?: string;
    trimStart?: string;
    trimEnd?: string;
    spinSpeed?: string;
    recordSize?: string;
    artworkScale?: string;
    recordTransparency?: string;
    stageBackgroundColor?: string;
    showTemplateInfo?: string;
    returnToEditor?: string;
  }>();

  const projectId = firstParam(params.projectId);
  const entrySource = firstParam(params.source);
  const initialLocalProjectId = firstParam(params.localProjectId) || null;
  const existingProjectId = asProjectId(projectId);
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const { isLocalGuest } = useLocalSession();
  const paramTitle = firstParam(params.title)?.trim() || "";
  const initialProjectTitle =
    paramTitle || DEFAULT_PROJECT_TITLE;
  const paramPhotoUri = normalizeMediaUri(decodeUriParam(firstParam(params.photoUri)));
  const paramAudioUri = normalizeMediaUri(decodeUriParam(firstParam(params.audioUri)));
  const paramPhotoName = firstParam(params.photoName);
  const paramAudioName = firstParam(params.audioName);
  const hasRouteMediaSnapshot = Boolean(paramPhotoUri || paramAudioUri);
  const [currentProjectId, setCurrentProjectId] = useState<Id<"projects"> | null>(
    existingProjectId,
  );
  const [currentLocalProjectId, setCurrentLocalProjectId] = useState<string | null>(
    initialLocalProjectId,
  );
  const projectDetails = useQuery(
    api.projects.getById,
    currentProjectId ? { projectId: currentProjectId } : "skip",
  );
  const photoUri = paramPhotoUri || normalizeMediaUri(projectDetails?.photoUri) || "";
  const audioUri = paramAudioUri || normalizeMediaUri(projectDetails?.audioUri) || "";
  const photoName =
    paramPhotoName ||
    projectDetails?.photoName ||
    fallbackMediaNameFromUri(photoUri, "Photo");
  const audioName =
    paramAudioName ||
    projectDetails?.audioName ||
    fallbackMediaNameFromUri(audioUri, "Audio");
  const initialAspectRatio = parseAspectRatioParam(params.aspectRatio);
  const initialTemplateId = resolveTemplateId(firstParam(params.templateId));
  const initialSpinSpeed = parseNumberParam(
    params.spinSpeed,
    DEFAULT_TEMPLATE_TWEAKS.spinSpeed,
  );
  const initialRecordSize = parseNumberParam(
    params.recordSize,
    DEFAULT_TEMPLATE_TWEAKS.recordSize,
  );
  const initialArtworkScale = parseNumberParam(
    params.artworkScale,
    DEFAULT_TEMPLATE_TWEAKS.artworkScale,
  );
  const initialRecordTransparency = parseNumberParam(
    params.recordTransparency,
    DEFAULT_TEMPLATE_TWEAKS.recordTransparency,
  );
  const initialStageBackgroundColor =
    firstParam(params.stageBackgroundColor) || null;
  const parsedTemplateTweaks = parseTemplateTweaksParam(
    firstParam(params.templateTweaks),
  );
  const initialTemplateTweaks = normalizeTemplateTweaks(
    parsedTemplateTweaks ?? {
      spinSpeed: initialSpinSpeed,
      recordSize: initialRecordSize,
      artworkScale: initialArtworkScale,
      recordTransparency: initialRecordTransparency,
      stageBackgroundColor: initialStageBackgroundColor,
    },
  );
  const initialTrimStart = parseNumberParam(params.trimStart, 0);
  const initialTrimEndRaw = parseNumberParam(params.trimEnd, DEFAULT_TRIM_DURATION);
  const initialTrimEnd =
    initialTrimEndRaw > initialTrimStart
      ? initialTrimEndRaw
      : initialTrimStart + DEFAULT_TRIM_DURATION;
  const initialShowTemplateInfo = parseShowTemplateInfoParam(
    params.showTemplateInfo,
  );

  const createProject = useMutation(api.projects.create);
  const updateProject = useMutation(api.projects.update);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(initialAspectRatio);
  const [templateId, setTemplateId] = useState(initialTemplateId);
  const [templateTweaks, setTemplateTweaks] =
    useState<TemplateTweaks>(initialTemplateTweaks);
  const [showTemplateInfo, setShowTemplateInfo] = useState<boolean>(
    initialShowTemplateInfo,
  );
  const serializedTemplateTweaks = serializeTemplateTweaksParam(templateTweaks);
  const [isTemplateCustomizeVisible, setIsTemplateCustomizeVisible] =
    useState(false);
  const [isTrimPanelVisible, setIsTrimPanelVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trimStart, setTrimStart] = useState(initialTrimStart);
  const [trimEnd, setTrimEnd] = useState(initialTrimEnd);
  const [previewPositionSec, setPreviewPositionSec] = useState(0);
  const [projectTitle, setProjectTitle] = useState(initialProjectTitle);
  const [isNameModalVisible, setIsNameModalVisible] = useState(false);
  const [projectNameDraft, setProjectNameDraft] = useState(
    initialProjectTitle === DEFAULT_PROJECT_TITLE ? "" : initialProjectTitle,
  );
  const [audioDurationSec, setAudioDurationSec] = useState(FALLBACK_AUDIO_DURATION);
  const [missingFiles, setMissingFiles] = useState<MissingFilesState>({
    photo: false,
    audio: false,
  });
  const [isCheckingFiles, setIsCheckingFiles] = useState(true);
  const [editorSaveStatus, setEditorSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [previewViewport, setPreviewViewport] = useState({
    width: 0,
    height: 0,
  });
  const [forceAutosaveTick, setForceAutosaveTick] = useState(0);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteTemplateTweaksUnsupportedRef = useRef(false);
  const forceAutosaveTickRef = useRef(0);
  const initialSnapshotRef = useRef<string | null>(null);
  const lastSavedSnapshotRef = useRef<string | null>(null);
  const hasTrackedEditStartedRef = useRef(false);
  const previousMediaUrisRef = useRef<{ photoUri: string; audioUri: string } | null>(null);
  const draftCreationPromiseRef = useRef<Promise<Id<"projects"> | null> | null>(
    null,
  );
  const localDraftCreationPromiseRef = useRef<Promise<string | null> | null>(null);
  const previewSoundRef = useRef<Audio.Sound | null>(null);
  const previewAudioUriRef = useRef<string | null>(null);
  const playbackBusyRef = useRef(false);
  const trimPanelHeightAnim = useRef(new Animated.Value(0)).current;
  const trimPanelVisualAnim = useRef(new Animated.Value(0)).current;
  const shouldWaitForProjectMedia =
    !!currentProjectId &&
    !paramPhotoUri &&
    !paramAudioUri &&
    projectDetails === undefined;

  const track = useCallback(
    (event: EventName, props?: Record<string, string>) => {
      posthog?.capture(event, props);
    },
    [posthog],
  );

  useEffect(() => {
    if (!existingProjectId) return;
    setCurrentProjectId(existingProjectId);
  }, [existingProjectId]);

  useEffect(() => {
    if (!initialLocalProjectId) return;
    setCurrentLocalProjectId(initialLocalProjectId);
  }, [initialLocalProjectId]);

  useEffect(() => {
    if (!photoUri || !/^https?:\/\//i.test(photoUri)) return;
    void Image.prefetch(photoUri).catch(() => {});
  }, [photoUri]);

  useEffect(() => {
    setTemplateId(resolveTemplateId(firstParam(params.templateId)));
  }, [params.templateId]);

  useEffect(() => {
    if (firstParam(params.templateTweaks) && hasRouteMediaSnapshot) return;
    const savedTemplateTweaksRaw = projectDetails?.templateTweaks;
    if (!savedTemplateTweaksRaw) return;
    const parsed = parseTemplateTweaksParam(savedTemplateTweaksRaw);
    if (!parsed) return;
    setTemplateTweaks((prev) => {
      const prevSerialized = serializeTemplateTweaksParam(prev);
      const nextSerialized = serializeTemplateTweaksParam(parsed);
      return prevSerialized === nextSerialized ? prev : parsed;
    });
  }, [hasRouteMediaSnapshot, params.templateTweaks, projectDetails?.templateTweaks]);

  useEffect(() => {
    if (firstParam(params.templateTweaks) && hasRouteMediaSnapshot) return;
    if (!currentProjectId) return;
    if (projectDetails?.templateTweaks) return;

    let isCancelled = false;
    void (async () => {
      const cached = await getCachedTemplateTweaks(String(currentProjectId));
      if (!cached || isCancelled) return;
      const parsed = parseTemplateTweaksParam(cached);
      if (!parsed) return;
      setTemplateTweaks((prev) => {
        const prevSerialized = serializeTemplateTweaksParam(prev);
        const nextSerialized = serializeTemplateTweaksParam(parsed);
        return prevSerialized === nextSerialized ? prev : parsed;
      });
    })();

    return () => {
      isCancelled = true;
    };
  }, [
    currentProjectId,
    hasRouteMediaSnapshot,
    params.templateTweaks,
    projectDetails?.templateTweaks,
  ]);

  const templateDefinitions = listTemplateDefinitions();
  const TemplateStageComponent = getTemplateDefinition(templateId).StageComponent;
  const nativeEditorAvailability = getIOSNativeUIPhase5Availability({
    minIOSVersion: 16,
  });
  const nativeEditorEnabledByContract = nativeEditorAvailability.enabled;
  const expoSwiftUI = nativeEditorEnabledByContract
    ? loadExpoSwiftUIModule()
    : null;
  const expoSwiftUIAny = expoSwiftUI as Record<string, unknown> | null;
  const hasNativeEditorControls = Boolean(
    expoSwiftUIAny &&
      "Host" in expoSwiftUIAny &&
      "HStack" in expoSwiftUIAny &&
      "Picker" in expoSwiftUIAny &&
      "Switch" in expoSwiftUIAny,
  );
  const canUseNativeEditorControls =
    nativeEditorEnabledByContract &&
    expoSwiftUI !== null &&
    hasNativeEditorControls;

  useEffect(() => {
    const toValue = isTrimPanelVisible ? 1 : 0;
    Animated.parallel([
      Animated.timing(trimPanelHeightAnim, {
        toValue,
        duration: TRIM_PANEL_ANIMATION_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(trimPanelVisualAnim, {
        toValue,
        duration: TRIM_PANEL_ANIMATION_DURATION_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [isTrimPanelVisible, trimPanelHeightAnim, trimPanelVisualAnim]);

  const createDraftProject = useCallback(async () => {
    if (currentProjectId) return currentProjectId;
    if (!isAuthenticated || !photoUri || !audioUri) return null;

    if (draftCreationPromiseRef.current) {
      return await draftCreationPromiseRef.current;
    }

    const roundedTrimStart = Math.round(trimStart * 100) / 100;
    const roundedTrimEnd = Math.round(trimEnd * 100) / 100;
    const normalizedTitle = projectTitle.trim() || DEFAULT_PROJECT_TITLE;
    const pending = (async (): Promise<Id<"projects"> | null> => {
      const tryCreate = async (retries = 1): Promise<Id<"projects"> | null> => {
        try {
          if (!remoteTemplateTweaksUnsupportedRef.current) {
            return await createProject({
              title: normalizedTitle,
              aspectRatio,
              photoUri,
              photoName,
              audioUri,
              audioName,
              trimStart: roundedTrimStart,
              trimEnd: roundedTrimEnd,
              templateId,
              templateTweaks: serializedTemplateTweaks,
            });
          }
          return await createProject({
            title: normalizedTitle,
            aspectRatio,
            photoUri,
            photoName,
            audioUri,
            audioName,
            trimStart: roundedTrimStart,
            trimEnd: roundedTrimEnd,
            templateId,
          });
        } catch (error) {
          if (
            !remoteTemplateTweaksUnsupportedRef.current &&
            isTemplateTweaksValidationError(error)
          ) {
            remoteTemplateTweaksUnsupportedRef.current = true;
            return await createProject({
              title: normalizedTitle,
              aspectRatio,
              photoUri,
              photoName,
              audioUri,
              audioName,
              trimStart: roundedTrimStart,
              trimEnd: roundedTrimEnd,
              templateId,
            });
          }
          if (isUnauthenticatedConvexError(error) && retries > 0) {
            await sleep(600);
            return await tryCreate(retries - 1);
          }
          return null;
        }
      };

      return await tryCreate();
    })();

    draftCreationPromiseRef.current = pending;
    try {
      const createdProjectId = await pending;
      if (createdProjectId) {
        setCurrentProjectId(createdProjectId);
        await setCachedTemplateTweaks(
          String(createdProjectId),
          serializedTemplateTweaks,
        );
      }
      return createdProjectId;
    } finally {
      draftCreationPromiseRef.current = null;
    }
  }, [
    currentProjectId,
    isAuthenticated,
    photoUri,
    audioUri,
    projectTitle,
    aspectRatio,
    trimStart,
    trimEnd,
    photoName,
    audioName,
    templateId,
    serializedTemplateTweaks,
    createProject,
  ]);

  const createLocalDraftProject = useCallback(async () => {
    if (currentLocalProjectId) return currentLocalProjectId;
    if (!isLocalGuest || !photoUri || !audioUri) return null;

    if (localDraftCreationPromiseRef.current) {
      return await localDraftCreationPromiseRef.current;
    }

    const roundedTrimStart = Math.round(trimStart * 100) / 100;
    const roundedTrimEnd = Math.round(trimEnd * 100) / 100;
    const normalizedTitle = projectTitle.trim() || DEFAULT_PROJECT_TITLE;
    const pending = (async (): Promise<string | null> => {
      const project = await upsertLocalProject({
        title: normalizedTitle,
        templateId,
        templateTweaks: serializedTemplateTweaks,
        aspectRatio,
        photoUri,
        photoName,
        audioUri,
        audioName,
        trimStart: roundedTrimStart,
        trimEnd: roundedTrimEnd,
        status: "draft",
      });
      return project.id;
    })();

    localDraftCreationPromiseRef.current = pending;
    try {
      const createdLocalProjectId = await pending;
      if (createdLocalProjectId) {
        setCurrentLocalProjectId(createdLocalProjectId);
      }
      return createdLocalProjectId;
    } finally {
      localDraftCreationPromiseRef.current = null;
    }
  }, [
    currentLocalProjectId,
    isLocalGuest,
    photoUri,
    audioUri,
    projectTitle,
    aspectRatio,
    trimStart,
    trimEnd,
    photoName,
    audioName,
    templateId,
    serializedTemplateTweaks,
  ]);

  useEffect(() => {
    if (currentProjectId || isAuthLoading || !isAuthenticated) return;
    if (!photoUri || !audioUri) return;
    void createDraftProject();
  }, [
    currentProjectId,
    isAuthLoading,
    isAuthenticated,
    photoUri,
    audioUri,
    createDraftProject,
  ]);

  useEffect(() => {
    if (!isLocalGuest || currentLocalProjectId) return;
    if (!photoUri || !audioUri) return;
    void createLocalDraftProject();
  }, [
    isLocalGuest,
    currentLocalProjectId,
    photoUri,
    audioUri,
    createLocalDraftProject,
  ]);

  useEffect(() => {
    track("preview_viewed", {
      hasPhoto: String(!!photoUri),
      hasAudio: String(!!audioUri),
      reopened: String(!!projectId || !!currentLocalProjectId),
    });
  }, [audioUri, photoUri, projectId, currentLocalProjectId, track]);

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function checkFiles() {
      // Fresh create sessions use newly picked media; "files not found"
      // protection is only needed for reopened historical projects.
      if (!projectId && !currentLocalProjectId) {
        if (!isCancelled) {
          setMissingFiles({ photo: false, audio: false });
          setIsCheckingFiles(false);
        }
        return;
      }

      if (shouldWaitForProjectMedia) {
        if (!isCancelled) {
          setIsCheckingFiles(true);
        }
        return;
      }

      setIsCheckingFiles(true);
      const [photoMissing, audioMissing] = await Promise.all([
        isMissingFile(photoUri),
        isMissingFile(audioUri),
      ]);

      if (!isCancelled) {
        setMissingFiles({ photo: photoMissing, audio: audioMissing });
        setIsCheckingFiles(false);
      }
    }

    checkFiles();
    return () => {
      isCancelled = true;
    };
  }, [
    photoUri,
    audioUri,
    projectId,
    currentLocalProjectId,
    shouldWaitForProjectMedia,
  ]);

  useEffect(() => {
    let isCancelled = false;

    async function loadAudioDuration() {
      if (!audioUri || missingFiles.audio) {
        if (!isCancelled) setAudioDurationSec(FALLBACK_AUDIO_DURATION);
        return;
      }

      const durationSec = await getAudioDurationSec(audioUri);
      if (!isCancelled) {
        setAudioDurationSec(
          durationSec && Number.isFinite(durationSec) && durationSec > 0
            ? durationSec
            : FALLBACK_AUDIO_DURATION,
        );
      }
    }

    loadAudioDuration();
    return () => {
      isCancelled = true;
    };
  }, [audioUri, missingFiles.audio]);

  const minTrimDuration = Math.min(5, Math.max(audioDurationSec, 1));
  const maxTrimDuration = Math.max(
    minTrimDuration,
    Math.min(audioDurationSec, 45),
  );

  useEffect(() => {
    const [nextStart, nextEnd] = clampTrimRange(
      trimStart,
      trimEnd,
      audioDurationSec,
      minTrimDuration,
      maxTrimDuration,
    );
    if (nextStart !== trimStart) setTrimStart(nextStart);
    if (nextEnd !== trimEnd) setTrimEnd(nextEnd);
  }, [
    audioDurationSec,
    minTrimDuration,
    maxTrimDuration,
    trimStart,
    trimEnd,
  ]);

  const stageWidthRatio = aspectRatio === "9:16" ? 9 / 16 : 1;
  const fallbackMaxStageWidth = Math.min(SCREEN_WIDTH - STAGE_HORIZONTAL_PADDING, 520);
  const fallbackMaxStageHeight = SCREEN_HEIGHT *
    (aspectRatio === "9:16"
      ? isTrimPanelVisible
        ? 0.62
        : 0.78
      : isTrimPanelVisible
        ? 0.52
        : 0.66);
  const measuredMaxStageWidth =
    previewViewport.width > 0
      ? Math.max(previewViewport.width - spacing.sm * 2, 0)
      : fallbackMaxStageWidth;
  const measuredMaxStageHeight =
    previewViewport.height > 0
      ? Math.max(previewViewport.height - spacing.sm * 2, 0)
      : fallbackMaxStageHeight;
  const maxStageWidth = Math.min(fallbackMaxStageWidth, measuredMaxStageWidth);
  const maxStageHeight = Math.min(fallbackMaxStageHeight, measuredMaxStageHeight);
  const stageWidth = Math.max(
    1,
    Math.min(maxStageWidth, maxStageHeight * stageWidthRatio),
  );
  const stageHeight = stageWidth / stageWidthRatio;

  const handlePreviewContainerLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      setPreviewViewport((prev) => {
        if (Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1) {
          return prev;
        }
        return { width, height };
      });
    },
    [],
  );

  const handleTrimChange = useCallback((start: number, end: number) => {
    const [nextStart, nextEnd] = clampTrimRange(
      start,
      end,
      audioDurationSec,
      minTrimDuration,
      maxTrimDuration,
    );
    setTrimStart(nextStart);
    setTrimEnd(nextEnd);
  }, [audioDurationSec, minTrimDuration, maxTrimDuration]);

  const unloadPreviewSound = useCallback(async () => {
    const sound = previewSoundRef.current;
    previewSoundRef.current = null;
    previewAudioUriRef.current = null;
    setIsPlaying(false);
    setPreviewPositionSec(0);
    if (!sound) return;
    try {
      sound.setOnPlaybackStatusUpdate(null);
    } catch {
      // Ignore cleanup callback detach failures.
    }
    try {
      await sound.unloadAsync();
    } catch {
      // Ignore unload failures.
    }
  }, []);

  const stopAndResetPreview = useCallback(async () => {
    const sound = previewSoundRef.current;
    const startMillis = Math.round(Math.max(trimStart, 0) * 1000);
    if (!sound) {
      setIsPlaying(false);
      setPreviewPositionSec(0);
      return;
    }
    try {
      await sound.pauseAsync();
    } catch {
      // Ignore pause failures.
    }
    try {
      await sound.setPositionAsync(startMillis);
    } catch {
      // Ignore seek failures.
    }
    setIsPlaying(false);
    setPreviewPositionSec(0);
  }, [trimStart]);

  const handlePlaybackStatusUpdate = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) return;

      const safeTrimStart = Math.max(0, trimStart);
      const safeTrimEnd = Math.max(safeTrimStart, trimEnd);
      const endMillis = Math.round(safeTrimEnd * 1000);
      const relativeSec = Math.max(0, status.positionMillis / 1000 - safeTrimStart);
      setPreviewPositionSec(Math.min(relativeSec, safeTrimEnd - safeTrimStart));

      if (
        status.didJustFinish ||
        (status.isPlaying && status.positionMillis >= endMillis - 40)
      ) {
        if (playbackBusyRef.current) return;
        playbackBusyRef.current = true;
        void (async () => {
          await stopAndResetPreview();
          playbackBusyRef.current = false;
        })();
      }
    },
    [trimStart, trimEnd, stopAndResetPreview],
  );

  const ensurePreviewSound = useCallback(async () => {
    if (!audioUri) {
      throw new Error("Missing audio file.");
    }

    const existingSound = previewSoundRef.current;
    if (existingSound && previewAudioUriRef.current === audioUri) {
      existingSound.setOnPlaybackStatusUpdate(handlePlaybackStatusUpdate);
      return existingSound;
    }

    await unloadPreviewSound();

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    const nextSound = new Audio.Sound();
    await nextSound.loadAsync(
      { uri: audioUri },
      {
        shouldPlay: false,
        positionMillis: Math.round(Math.max(trimStart, 0) * 1000),
        progressUpdateIntervalMillis: 80,
      },
      false,
    );
    nextSound.setOnPlaybackStatusUpdate(handlePlaybackStatusUpdate);

    previewSoundRef.current = nextSound;
    previewAudioUriRef.current = audioUri;
    return nextSound;
  }, [audioUri, handlePlaybackStatusUpdate, trimStart, unloadPreviewSound]);

  const handlePlayPause = useCallback(() => {
    if (playbackBusyRef.current) return;
    if (!audioUri || missingFiles.audio) {
      Alert.alert(
        "Audio not available",
        "Select an audio file to preview playback.",
      );
      return;
    }

    playbackBusyRef.current = true;
    void (async () => {
      try {
        if (isPlaying) {
          await stopAndResetPreview();
          return;
        }

        const sound = await ensurePreviewSound();
        const startMillis = Math.round(Math.max(trimStart, 0) * 1000);
        await sound.setPositionAsync(startMillis);
        await sound.playAsync();
        setPreviewPositionSec(0);
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
        setPreviewPositionSec(0);
        Alert.alert(
          "Preview unavailable",
          "Couldn't play this track right now. Try re-selecting the audio file.",
        );
      } finally {
        playbackBusyRef.current = false;
      }
    })();
  }, [
    audioUri,
    ensurePreviewSound,
    isPlaying,
    missingFiles.audio,
    stopAndResetPreview,
    trimStart,
  ]);

  useEffect(() => {
    void stopAndResetPreview();
  }, [trimStart, trimEnd, stopAndResetPreview]);

  useEffect(() => {
    const sound = previewSoundRef.current;
    if (!sound) return;
    sound.setOnPlaybackStatusUpdate(handlePlaybackStatusUpdate);
  }, [handlePlaybackStatusUpdate]);

  useEffect(() => {
    void unloadPreviewSound();
  }, [audioUri, unloadPreviewSound]);

  useEffect(() => {
    if (missingFiles.audio || !audioUri) {
      void unloadPreviewSound();
    }
  }, [audioUri, missingFiles.audio, unloadPreviewSound]);

  useEffect(() => {
    return () => {
      void unloadPreviewSound();
    };
  }, [unloadPreviewSound]);

  const handleOpenProjectNameModal = useCallback(() => {
    setProjectNameDraft(
      projectTitle === DEFAULT_PROJECT_TITLE ? "" : projectTitle,
    );
    setIsNameModalVisible(true);
    track("project_title_edit_opened", {
      reopened: String(!!existingProjectId || !!currentLocalProjectId),
    });
  }, [existingProjectId, currentLocalProjectId, projectTitle, track]);

  const handleCloseProjectNameModal = useCallback(() => {
    setIsNameModalVisible(false);
  }, []);

  const handleSaveProjectTitle = useCallback(() => {
    const nextTitle = projectNameDraft.trim();
    if (!nextTitle) return;
    if (nextTitle !== projectTitle) {
      setProjectTitle(nextTitle);
      track("project_title_updated", {
        reopened: String(!!existingProjectId || !!currentLocalProjectId),
      });
    }
    setIsNameModalVisible(false);
  }, [
    existingProjectId,
    currentLocalProjectId,
    projectNameDraft,
    projectTitle,
    track,
  ]);

  const persistProjectSnapshot = useCallback(async (): Promise<boolean> => {
    const hasRemoteProject = !!currentProjectId;
    const hasLocalProject = !!currentLocalProjectId;
    if (!hasRemoteProject && !hasLocalProject) return false;
    if (hasRemoteProject && shouldWaitForProjectMedia) return false;

    const roundedTrimStart = Math.round(trimStart * 100) / 100;
    const roundedTrimEnd = Math.round(trimEnd * 100) / 100;
    const normalizedTitle = projectTitle.trim() || DEFAULT_PROJECT_TITLE;
    const trackedProjectId = currentProjectId
      ? String(currentProjectId)
      : (currentLocalProjectId ?? "local_draft");
    const nextSnapshot = JSON.stringify({
      title: normalizedTitle,
      templateId,
      templateTweaks: serializedTemplateTweaks,
      aspectRatio,
      trimStart: roundedTrimStart,
      trimEnd: roundedTrimEnd,
      photoUri,
      audioUri,
    });

    if (nextSnapshot === lastSavedSnapshotRef.current) {
      return true;
    }

    setEditorSaveStatus("saving");
    try {
      if (isLocalGuest && currentLocalProjectId) {
        await upsertLocalProject({
          id: currentLocalProjectId,
          title: normalizedTitle,
          templateId,
          templateTweaks: serializedTemplateTweaks,
          aspectRatio,
          photoUri,
          photoName,
          audioUri,
          audioName,
          trimStart: roundedTrimStart,
          trimEnd: roundedTrimEnd,
          status: "draft",
        });
      } else if (currentProjectId) {
        if (!remoteTemplateTweaksUnsupportedRef.current) {
          try {
            await updateProject({
              projectId: currentProjectId,
              title: normalizedTitle,
              templateId,
              templateTweaks: serializedTemplateTweaks,
              aspectRatio,
              trimStart: roundedTrimStart,
              trimEnd: roundedTrimEnd,
              photoUri,
              photoName,
              audioUri,
              audioName,
            });
          } catch (error) {
            if (!isTemplateTweaksValidationError(error)) {
              throw error;
            }
            remoteTemplateTweaksUnsupportedRef.current = true;
            await updateProject({
              projectId: currentProjectId,
              title: normalizedTitle,
              templateId,
              aspectRatio,
              trimStart: roundedTrimStart,
              trimEnd: roundedTrimEnd,
              photoUri,
              photoName,
              audioUri,
              audioName,
            });
          }
        } else {
          await updateProject({
            projectId: currentProjectId,
            title: normalizedTitle,
            templateId,
            aspectRatio,
            trimStart: roundedTrimStart,
            trimEnd: roundedTrimEnd,
            photoUri,
            photoName,
            audioUri,
            audioName,
          });
        }
        await setCachedTemplateTweaks(
          String(currentProjectId),
          serializedTemplateTweaks,
        );
      } else {
        return false;
      }

      lastSavedSnapshotRef.current = nextSnapshot;
      if (!initialSnapshotRef.current) {
        initialSnapshotRef.current = nextSnapshot;
      }
      setEditorSaveStatus("saved");
      track("project_autosave_succeeded", {
        projectId: trackedProjectId,
      });
      return true;
    } catch {
      setEditorSaveStatus("error");
      track("project_autosave_failed", {
        projectId: trackedProjectId,
      });
      return false;
    }
  }, [
    currentProjectId,
    currentLocalProjectId,
    shouldWaitForProjectMedia,
    trimStart,
    trimEnd,
    projectTitle,
    templateId,
    serializedTemplateTweaks,
    aspectRatio,
    photoUri,
    photoName,
    audioUri,
    audioName,
    isLocalGuest,
    track,
    upsertLocalProject,
    updateProject,
  ]);

  useEffect(() => {
    const hasRemoteProject = !!currentProjectId;
    const hasLocalProject = !!currentLocalProjectId;
    if (!hasRemoteProject && !hasLocalProject) return;
    if (hasRemoteProject && shouldWaitForProjectMedia) return;

    const roundedTrimStart = Math.round(trimStart * 100) / 100;
    const roundedTrimEnd = Math.round(trimEnd * 100) / 100;
    const normalizedTitle = projectTitle.trim() || DEFAULT_PROJECT_TITLE;
    const trackedProjectId = currentProjectId
      ? String(currentProjectId)
      : (currentLocalProjectId ?? "local_draft");
    const nextSnapshot = JSON.stringify({
      title: normalizedTitle,
      templateId,
      templateTweaks: serializedTemplateTweaks,
      aspectRatio,
      trimStart: roundedTrimStart,
      trimEnd: roundedTrimEnd,
      photoUri,
      audioUri,
    });

    if (!initialSnapshotRef.current) {
      initialSnapshotRef.current = nextSnapshot;
      lastSavedSnapshotRef.current = nextSnapshot;
      setEditorSaveStatus("saved");
      return;
    }

    const forceSave = forceAutosaveTick !== forceAutosaveTickRef.current;
    if (forceSave) {
      forceAutosaveTickRef.current = forceAutosaveTick;
    }

    if (!forceSave && nextSnapshot === lastSavedSnapshotRef.current) {
      return;
    }

    if (
      !hasTrackedEditStartedRef.current &&
      nextSnapshot !== initialSnapshotRef.current
    ) {
      hasTrackedEditStartedRef.current = true;
      track("project_edit_started", {
        projectId: trackedProjectId,
      });
    }

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    setEditorSaveStatus("saving");

    autosaveTimerRef.current = setTimeout(() => {
      void persistProjectSnapshot();
    }, 700);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [
    currentProjectId,
    currentLocalProjectId,
    isLocalGuest,
    shouldWaitForProjectMedia,
    forceAutosaveTick,
    projectTitle,
    templateId,
    serializedTemplateTweaks,
    aspectRatio,
    trimStart,
    trimEnd,
    photoUri,
    photoName,
    audioUri,
    audioName,
    track,
    persistProjectSnapshot,
  ]);

  useEffect(() => {
    const trackedProjectId = currentProjectId
      ? String(currentProjectId)
      : currentLocalProjectId;
    if (!trackedProjectId) return;

    if (!previousMediaUrisRef.current) {
      previousMediaUrisRef.current = { photoUri, audioUri };
      return;
    }

    const previous = previousMediaUrisRef.current;
    const photoChanged = previous.photoUri !== photoUri;
    const audioChanged = previous.audioUri !== audioUri;
    previousMediaUrisRef.current = { photoUri, audioUri };

    if (!photoChanged && !audioChanged) return;

    track("project_media_replaced", {
      projectId: trackedProjectId,
      photoChanged: String(photoChanged),
      audioChanged: String(audioChanged),
    });
  }, [currentProjectId, currentLocalProjectId, photoUri, audioUri, track]);

  const handleCloseEditor = useCallback(() => {
    void (async () => {
      try {
        if (autosaveTimerRef.current) {
          clearTimeout(autosaveTimerRef.current);
          autosaveTimerRef.current = null;
        }
        await persistProjectSnapshot();
        if (isLocalGuest) {
          await createLocalDraftProject();
        } else {
          await createDraftProject();
        }
      } finally {
        if (entrySource === "home") {
          router.replace("/" as const);
          return;
        }
        router.replace("/" as const);
      }
    })();
  }, [
    entrySource,
    isLocalGuest,
    createLocalDraftProject,
    createDraftProject,
    persistProjectSnapshot,
    router,
  ]);

  const handleSwapMedia = useCallback(
    (initialTab: "photo" | "audio") => {
      router.push({
        pathname: "/create/picker",
        params: {
          source: entrySource ?? "",
          projectId: currentProjectId ? String(currentProjectId) : "",
          localProjectId: currentLocalProjectId ?? "",
          title: projectTitle,
          photoUri: encodeUriParam(photoUri),
          photoName,
          audioUri: encodeUriParam(audioUri),
          audioName,
          aspectRatio,
          templateId,
          templateTweaks: serializedTemplateTweaks,
          showTemplateInfo: showTemplateInfo ? "1" : "0",
          trimStart: String(trimStart),
          trimEnd: String(trimEnd),
          initialTab,
          returnToEditor: "1",
        },
      });
    },
    [
      router,
      currentProjectId,
      currentLocalProjectId,
      projectTitle,
      photoUri,
      photoName,
      audioUri,
      audioName,
      aspectRatio,
      templateId,
      serializedTemplateTweaks,
      showTemplateInfo,
      trimStart,
      trimEnd,
      entrySource,
    ],
  );

  const canExport =
    !!photoUri &&
    !!audioUri &&
    !missingFiles.photo &&
    !missingFiles.audio &&
    !isCheckingFiles;

  const handleExport = useCallback(() => {
    void (async () => {
      if (!canExport) {
        return;
      }

      await stopAndResetPreview();
      await unloadPreviewSound();

      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      await persistProjectSnapshot();

      const [safeTrimStart, safeTrimEnd] = clampTrimRange(
        trimStart,
        trimEnd,
        audioDurationSec,
        minTrimDuration,
        maxTrimDuration,
      );

      router.push({
        pathname: "/create/rendering",
        params: {
          projectId: currentProjectId ? String(currentProjectId) : "",
          localProjectId: currentLocalProjectId ?? "",
          title: projectTitle,
          photoUri: encodeUriParam(photoUri),
          photoName,
          audioUri: encodeUriParam(audioUri),
          audioName,
          trimStart: String(safeTrimStart),
          trimEnd: String(safeTrimEnd),
          aspectRatio,
          templateId,
          templateTweaks: serializedTemplateTweaks,
          showTemplateInfo: showTemplateInfo ? "1" : "0",
        },
      });
    })();
  }, [
    canExport,
    router,
    currentProjectId,
    currentLocalProjectId,
    projectTitle,
    photoUri,
    photoName,
    audioUri,
    audioName,
    trimStart,
    trimEnd,
    audioDurationSec,
    minTrimDuration,
    maxTrimDuration,
    aspectRatio,
    templateId,
    serializedTemplateTweaks,
    showTemplateInfo,
    persistProjectSnapshot,
    stopAndResetPreview,
    unloadPreviewSound,
  ]);

  const handleTemplateChange = useCallback((nextTemplateId: string) => {
    const resolvedId = resolveTemplateId(nextTemplateId);
    setTemplateId((prev) => (prev === resolvedId ? prev : resolvedId));
  }, []);

  const handleOpenTemplateCustomize = useCallback(() => {
    track("editor_controls_opened", { surface: "template" });
    setIsTemplateCustomizeVisible(true);
  }, [track]);

  const handleSetTemplateInfoVisibility = useCallback(
    (nextValue: boolean) => {
      setShowTemplateInfo((prev) => {
        if (prev === nextValue) return prev;
        track("editor_controls_opened", {
          surface: nextValue ? "template_info_on" : "template_info_off",
        });
        return nextValue;
      });
    },
    [track],
  );

  const handleToggleTemplateInfo = useCallback(() => {
    handleSetTemplateInfoVisibility(!showTemplateInfo);
  }, [handleSetTemplateInfoVisibility, showTemplateInfo]);

  const handleSetAspectRatio = useCallback(
    (nextValue: AspectRatio) => {
      setAspectRatio((prev) => {
        if (prev === nextValue) return prev;
        track("editor_controls_opened", {
          surface: nextValue === "9:16" ? "aspect_ratio_9x16" : "aspect_ratio_1x1",
        });
        return nextValue;
      });
    },
    [track],
  );

  const handleToggleAspectRatio = useCallback(() => {
    handleSetAspectRatio(aspectRatio === "9:16" ? "1:1" : "9:16");
  }, [aspectRatio, handleSetAspectRatio]);

  const handleNativeAspectRatioSelect = useCallback(
    (index: number) => {
      handleSetAspectRatio(NATIVE_ASPECT_RATIO_OPTIONS[index] ?? "9:16");
    },
    [handleSetAspectRatio],
  );

  const handleNativeTemplateInfoChange = useCallback(
    (nextValue: boolean) => {
      handleSetTemplateInfoVisibility(nextValue);
    },
    [handleSetTemplateInfoVisibility],
  );

  const handleToggleTrimPanel = useCallback(() => {
    setIsTrimPanelVisible((prev) => {
      const next = !prev;
      track("editor_controls_opened", {
        surface: next ? "trim_audio_on" : "trim_audio_off",
      });
      return next;
    });
  }, [track]);

  const handleCloseTemplateCustomize = useCallback(() => {
    setIsTemplateCustomizeVisible(false);
  }, []);

  const handleApplyTemplateCustomize = useCallback(
    (next: {
      tweaks: TemplateTweaks;
      aspectRatio: AspectRatio;
      templateId: string;
    }) => {
      handleSetAspectRatio(next.aspectRatio);
      handleTemplateChange(next.templateId);

      const normalizedNext = normalizeTemplateTweaks(next.tweaks);
      if (normalizedNext.spinSpeed !== templateTweaks.spinSpeed) {
        track("template_tweak_changed", { control: "spin_speed" });
      }
      if (normalizedNext.recordSize !== templateTweaks.recordSize) {
        track("template_tweak_changed", { control: "record_size" });
      }
      if (normalizedNext.artworkScale !== templateTweaks.artworkScale) {
        track("template_tweak_changed", { control: "artwork_size" });
      }
      if (normalizedNext.recordTransparency !== templateTweaks.recordTransparency) {
        track("template_tweak_changed", { control: "record_transparency" });
      }
      if (normalizedNext.backgroundBlur !== templateTweaks.backgroundBlur) {
        track("template_tweak_changed", { control: "background_blur" });
      }
      if (normalizedNext.rotationStartDeg !== templateTweaks.rotationStartDeg) {
        track("template_tweak_changed", { control: "rotation_start_angle" });
      }
      if (normalizedNext.rotationDirection !== templateTweaks.rotationDirection) {
        track("template_tweak_changed", { control: "rotation_direction" });
      }
      if (
        (normalizedNext.stageBackgroundColor ?? "") !==
          (templateTweaks.stageBackgroundColor ?? "") ||
        (normalizedNext.stageBackgroundImageUri ?? "") !==
          (templateTweaks.stageBackgroundImageUri ?? "")
      ) {
        track("template_tweak_changed", { control: "stage_background" });
      }
      if (normalizedNext.showWatermark !== templateTweaks.showWatermark) {
        track("template_tweak_changed", { control: "watermark" });
      }
      setTemplateTweaks(normalizedNext);
      setIsTemplateCustomizeVisible(false);
    },
    [handleSetAspectRatio, handleTemplateChange, templateTweaks, track],
  );

  const handleTemplateSelectedFromTemplateCustomize = useCallback(
    (nextTemplateId: string) => {
      track("template_selected_from_edit_media", {
        templateId: resolveTemplateId(nextTemplateId),
      });
    },
    [track],
  );

  const handleSwapMediaFromTemplateCustomize = useCallback(
    (tab: "photo" | "audio") => {
      track("media_swap_started_from_edit_media", { media_type: tab });
      setIsTemplateCustomizeVisible(false);
      handleSwapMedia(tab);
    },
    [handleSwapMedia, track],
  );

  const trimmedDuration = Math.max(0, trimEnd - trimStart);
  const showMissingNotice = !isCheckingFiles && (missingFiles.photo || missingFiles.audio);
  const trackTitle = displayMediaLabel(audioName, "Untitled track");
  const subtitle = projectTitle.trim() || DEFAULT_PROJECT_TITLE;
  const playbackLabel = isPlaying ? "Now Playing" : "Paused";
  const trimPanelMaxHeight = trimPanelHeightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, TRIM_PANEL_MAX_HEIGHT],
  });
  const trimPanelOpacity = trimPanelVisualAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const trimPanelTranslateY = trimPanelVisualAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0],
  });

  let missingMessage = "The original files may have been moved or deleted. Replace missing files to continue.";
  if (missingFiles.photo && !missingFiles.audio) {
    missingMessage =
      "The original photo is no longer available on this device. Replace it to continue.";
  } else if (!missingFiles.photo && missingFiles.audio) {
    missingMessage =
      "The original audio file is no longer available on this device. Replace it to continue.";
  }
  const canSaveProjectTitle =
    projectNameDraft.trim().length > 0;
  const fallbackTopInset = Math.max(
    initialWindowMetrics?.insets.top ?? 0,
    Constants.statusBarHeight ?? 0,
  );
  const fallbackBottomInset = initialWindowMetrics?.insets.bottom ?? 0;
  const stableTopInset = Math.max(insets.top, fallbackTopInset);
  const stableBottomInset = Math.max(insets.bottom, fallbackBottomInset);

  return (
    <SafeAreaView style={[styles.container, { paddingBottom: stableBottomInset }]} edges={[]}>
      <View style={[styles.header, { paddingTop: stableTopInset + spacing.sm }]}>
        <View style={[styles.headerSide, styles.headerSideLeft]}>
          <Pressable
            onPress={handleCloseEditor}
            style={styles.headerButton}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={24} color={colors.dark.text} />
          </Pressable>
        </View>

        <Pressable
          onPress={handleOpenProjectNameModal}
          style={styles.headerTitleButton}
          accessibilityLabel="Edit project name"
          accessibilityRole="button"
        >
          <Text style={styles.headerTitle} numberOfLines={1}>
            {projectTitle}
          </Text>
          <Ionicons
            name="chevron-down"
            size={14}
            color={colors.dark.textSecondary}
          />
        </Pressable>

        <View style={[styles.headerSide, styles.headerSideRight]}>
          <Pressable
            onPress={handleExport}
            style={({ pressed }) => [
              styles.exportButton,
              !canExport && styles.exportButtonDisabled,
              pressed && canExport && styles.exportButtonPressed,
            ]}
            disabled={!canExport}
            accessibilityLabel="Export video"
            accessibilityRole="button"
            accessibilityState={{ disabled: !canExport }}
          >
            <Text style={styles.exportText}>Export</Text>
          </Pressable>
        </View>
      </View>

      <Modal
        visible={isNameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseProjectNameModal}
      >
        <KeyboardAvoidingView
          style={styles.projectNameModalRoot}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable
            style={styles.projectNameModalBackdrop}
            onPress={handleCloseProjectNameModal}
            accessibilityLabel="Close project name editor"
            accessibilityRole="button"
          />
          <View style={styles.projectNameModalSheet}>
            <View style={styles.projectNameModalHandle} />
            <View style={styles.projectNameModalHeader}>
              <Pressable
                onPress={handleCloseProjectNameModal}
                style={styles.projectNameHeaderButton}
                accessibilityLabel="Close project name editor"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={18} color={colors.dark.text} />
              </Pressable>
              <Text style={styles.projectNameModalTitle}>Project name</Text>
              <View style={styles.projectNameHeaderButton} />
            </View>

            <View style={styles.projectNameInputWrap}>
              <TextInput
                autoFocus
                value={projectNameDraft}
                onChangeText={setProjectNameDraft}
                placeholder="Name your project..."
                placeholderTextColor={colors.dark.textSecondary}
                style={styles.projectNameInput}
                maxLength={60}
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (!canSaveProjectTitle) return;
                  void handleSaveProjectTitle();
                }}
              />
              {projectNameDraft.length > 0 ? (
                <Pressable
                  onPress={() => setProjectNameDraft("")}
                  accessibilityLabel="Clear project name"
                  accessibilityRole="button"
                >
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={colors.dark.textSecondary}
                  />
                </Pressable>
              ) : null}
            </View>

            <Pressable
              onPress={() => {
                handleSaveProjectTitle();
              }}
              disabled={!canSaveProjectTitle}
              style={({ pressed }) => [
                styles.projectNameDoneButton,
                !canSaveProjectTitle && styles.projectNameDoneButtonDisabled,
                pressed && canSaveProjectTitle && styles.projectNameDoneButtonPressed,
              ]}
              accessibilityLabel="Save project name"
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSaveProjectTitle }}
            >
              <Text style={styles.projectNameDoneText}>Done</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {showMissingNotice && (
        <View style={styles.missingNotice}>
          <Ionicons
            name="warning-outline"
            size={18}
            color={colors.accent.warning}
          />
          <View style={styles.missingNoticeTextWrap}>
            <Text style={styles.missingNoticeTitle}>Files not found</Text>
            <Text style={styles.missingNoticeText}>{missingMessage}</Text>
          </View>
        </View>
      )}

      <View style={styles.previewContainer} onLayout={handlePreviewContainerLayout}>
        <View style={[styles.previewStageFrame, { width: stageWidth, height: stageHeight }]}>
          <TemplateStageComponent
            width={stageWidth}
            height={stageHeight}
            aspectRatio={aspectRatio}
            photoUri={photoUri && !missingFiles.photo ? photoUri : null}
            isPlaying={isPlaying}
            playbackLabel={playbackLabel}
            trackTitle={trackTitle}
            subtitle={subtitle}
            templateTweaks={templateTweaks}
            onTogglePlay={handlePlayPause}
            showWatermark={templateTweaks.showWatermark}
          />
          <View style={styles.previewActionRow}>
            <Pressable
              onPress={handleOpenTemplateCustomize}
              style={({ pressed }) => [
                styles.previewTemplateButton,
                pressed && styles.previewTemplateButtonPressed,
              ]}
              accessibilityLabel="Open template settings"
              accessibilityRole="button"
            >
              <Ionicons name="settings-outline" size={18} color={colors.dark.text} />
            </Pressable>
            <Pressable
              onPress={handleToggleTrimPanel}
              style={({ pressed }) => [
                styles.previewTrimToggleButton,
                isTrimPanelVisible && styles.previewTrimToggleButtonActive,
                pressed && styles.previewTrimToggleButtonPressed,
              ]}
              accessibilityLabel={
                isTrimPanelVisible ? "Hide Trim Audio panel" : "Show Trim Audio panel"
              }
              accessibilityRole="button"
              accessibilityState={{
                selected: isTrimPanelVisible,
                expanded: isTrimPanelVisible,
              }}
            >
              <Ionicons
                name="cut-outline"
                size={15}
                color={isTrimPanelVisible ? colors.dark.background : colors.dark.text}
              />
              <Text
                style={[
                  styles.previewTrimToggleText,
                  isTrimPanelVisible && styles.previewTrimToggleTextActive,
                ]}
              >
                Trim Audio
              </Text>
            </Pressable>
          </View>
          <Pressable
            onPress={handleToggleTemplateInfo}
            style={({ pressed }) => [
              styles.previewInfoToggleButton,
              styles.previewInfoToggleButtonTopLeft,
              showTemplateInfo && styles.previewInfoToggleButtonActive,
              pressed && styles.previewTemplateButtonPressed,
            ]}
            accessibilityLabel={
              showTemplateInfo
                ? "Hide template information"
                : "Show template information"
            }
            accessibilityRole="button"
            accessibilityState={{ selected: showTemplateInfo }}
          >
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={showTemplateInfo ? colors.dark.background : colors.dark.text}
            />
          </Pressable>
          <Pressable
            onPress={handleToggleAspectRatio}
            style={({ pressed }) => [
              styles.previewAspectRatioBadge,
              pressed && styles.previewAspectRatioBadgePressed,
            ]}
            accessibilityLabel={`Switch aspect ratio (currently ${aspectRatio})`}
            accessibilityRole="button"
          >
            <Text style={styles.previewAspectRatioText}>{aspectRatio}</Text>
          </Pressable>
          {showTemplateInfo ? (
            <TemplateInfoBadge
              templateId={templateId}
              templateTweaks={templateTweaks}
              aspectRatio={aspectRatio}
              compact
              style={styles.previewTemplateInfoBadge}
            />
          ) : null}
        </View>
      </View>

      {canUseNativeEditorControls && expoSwiftUI ? (
        <View style={styles.nativeEditorControlsWrap}>
          <expoSwiftUI.Host style={styles.nativeEditorControlsHost} colorScheme="dark">
            <expoSwiftUI.HStack spacing={10}>
              <expoSwiftUI.Picker
                label="Aspect ratio"
                options={NATIVE_ASPECT_RATIO_OPTIONS}
                selectedIndex={Math.max(
                  0,
                  NATIVE_ASPECT_RATIO_OPTIONS.indexOf(aspectRatio),
                )}
                variant="segmented"
                onOptionSelected={(event) => {
                  handleNativeAspectRatioSelect(event.nativeEvent.index);
                }}
              />
              <expoSwiftUI.Switch
                label="Template info"
                value={showTemplateInfo}
                variant="button"
                onValueChange={handleNativeTemplateInfoChange}
              />
            </expoSwiftUI.HStack>
          </expoSwiftUI.Host>
        </View>
      ) : null}

      <Animated.View
        style={[styles.trimmerPanelWrap, { maxHeight: trimPanelMaxHeight }]}
        pointerEvents={isTrimPanelVisible ? "auto" : "none"}
      >
        <Animated.View
          style={[
            styles.trimmerPanelAnimatedContent,
            {
              opacity: trimPanelOpacity,
              transform: [{ translateY: trimPanelTranslateY }],
            },
          ]}
        >
          <View style={styles.trimmerSection}>
            <Text style={styles.sectionLabel}>Trim Audio</Text>
            <AudioTrimmer
              durationSec={audioDurationSec}
              startSec={trimStart}
              endSec={trimEnd}
              onTrimChange={handleTrimChange}
              centerTimeLabel={`${formatClock(previewPositionSec)} / ${formatClock(trimmedDuration)}`}
              isPlaying={isPlaying}
              playbackProgressSec={previewPositionSec}
              onTogglePlay={handlePlayPause}
              minDuration={minTrimDuration}
              maxDuration={maxTrimDuration}
            />
          </View>
        </Animated.View>
      </Animated.View>

      <TemplateCustomizeModal
        visible={isTemplateCustomizeVisible}
        aspectRatio={aspectRatio}
        templateId={templateId}
        templateDefinitions={templateDefinitions}
        photoUri={photoUri}
        photoLabel={photoName}
        audioLabel={audioName}
        value={templateTweaks}
        showTemplateInfo={showTemplateInfo}
        onTemplateSelectionChanged={handleTemplateSelectedFromTemplateCustomize}
        onSwapPhoto={() => handleSwapMediaFromTemplateCustomize("photo")}
        onSwapAudio={() => handleSwapMediaFromTemplateCustomize("audio")}
        onClose={handleCloseTemplateCustomize}
        onApply={handleApplyTemplateCustomize}
      />
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
  headerSide: {
    width: 96,
    minHeight: 40,
    justifyContent: "center",
  },
  headerSideLeft: {
    alignItems: "flex-start",
  },
  headerSideRight: {
    alignItems: "flex-end",
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    backgroundColor: colors.dark.surface,
  },
  headerTitle: {
    ...typography.body,
    fontWeight: "600",
    color: colors.dark.text,
    maxWidth: "88%",
    textAlign: "center",
  },
  headerTitleButton: {
    flex: 1,
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: spacing.xs,
  },
  exportButton: {
    minWidth: 84,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.accent.primary,
  },
  exportButtonDisabled: {
    opacity: 0.45,
  },
  exportButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  exportText: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.accent.onPrimary,
  },
  projectNameModalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  projectNameModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  projectNameModalSheet: {
    backgroundColor: "#111318",
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  projectNameModalHandle: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginBottom: spacing.xs,
  },
  projectNameModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  projectNameHeaderButton: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  projectNameModalTitle: {
    ...typography.body,
    color: colors.dark.text,
    fontWeight: "700",
  },
  projectNameInputWrap: {
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  projectNameInput: {
    flex: 1,
    ...typography.body,
    color: colors.dark.text,
    paddingVertical: spacing.sm,
  },
  projectNameDoneButton: {
    minHeight: 46,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  projectNameDoneButtonDisabled: {
    opacity: 0.35,
  },
  projectNameDoneButtonPressed: {
    opacity: 0.85,
  },
  projectNameDoneText: {
    ...typography.button,
    color: colors.dark.background,
    fontWeight: "700",
  },
  missingNotice: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,149,0,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,149,0,0.35)",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  missingNoticeTextWrap: {
    flex: 1,
    gap: 2,
  },
  missingNoticeTitle: {
    ...typography.caption,
    color: colors.accent.warning,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  missingNoticeText: {
    ...typography.caption,
    color: colors.dark.textSecondary,
    lineHeight: 18,
  },
  previewContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: 0,
  },
  previewStageFrame: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  previewActionRow: {
    position: "absolute",
    left: spacing.sm,
    bottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  previewTemplateButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.dark.surface,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  previewInfoToggleButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.dark.surface,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  previewInfoToggleButtonTopLeft: {
    position: "absolute",
    left: spacing.sm,
    top: spacing.sm,
  },
  previewInfoToggleButtonActive: {
    backgroundColor: colors.dark.text,
    borderColor: "rgba(255,255,255,0.72)",
  },
  previewTemplateButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  previewTrimToggleButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.dark.surface,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  previewTrimToggleButtonActive: {
    backgroundColor: colors.dark.text,
    borderColor: "rgba(255,255,255,0.85)",
  },
  previewTrimToggleButtonPressed: {
    opacity: 0.82,
  },
  previewTrimToggleText: {
    ...typography.caption,
    color: colors.dark.text,
    fontWeight: "700",
  },
  previewTrimToggleTextActive: {
    color: colors.dark.background,
  },
  previewAspectRatioBadge: {
    position: "absolute",
    right: spacing.sm,
    top: spacing.sm,
    minHeight: 40,
    minWidth: 56,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.dark.surface,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  previewAspectRatioText: {
    ...typography.caption,
    color: colors.dark.text,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  previewAspectRatioBadgePressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  previewTemplateInfoBadge: {
    position: "absolute",
    top: spacing.sm + 48,
    left: spacing.sm,
    right: spacing.sm,
  },
  nativeEditorControlsWrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  nativeEditorControlsHost: {
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.dark.surface,
  },
  trimmerPanelWrap: {
    overflow: "hidden",
  },
  trimmerPanelAnimatedContent: {
    width: "100%",
  },
  trimmerSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.dark.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
    alignSelf: "center",
  },
});
