import { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Dimensions,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { usePostHog } from "posthog-react-native";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import * as FileSystem from "expo-file-system/legacy";
import { Audio, type AVPlaybackStatus } from "expo-av";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { colors, typography, spacing, radius } from "@/constants/tokens";
import { AudioTrimmer } from "@/components/create/AudioTrimmer";
import {
  AspectRatioToggle,
  type AspectRatio,
} from "@/components/create/AspectRatioToggle";
import { SpinningCdTemplateStage } from "@/components/create/SpinningCdTemplateStage";
import type { EventName } from "@/lib/analytics";
import { decodeUriParam, encodeUriParam, fileNameFromUri } from "@/lib/uri";
import { sleep } from "@/lib/utils";
import { useLocalSession } from "@/providers/localSession";
import { upsertLocalProject } from "@/lib/localProjects";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const STAGE_HORIZONTAL_PADDING = spacing.lg * 2;
const FALLBACK_AUDIO_DURATION = 180;
const DEFAULT_PROJECT_TITLE = "New Project";

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
  if (!uri) return true;
  if (!uri.startsWith("file://")) return false;

  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) return false;
  } catch {
    // Fall through to loader-based checks below.
  }

  // Metadata checks can be wrong on some iOS sandboxed files.
  // Try actually loading media before declaring "missing".
  const isLikelyAudio = /\.(mp3|wav|m4a|aac|mp4)$/i.test(uri);
  if (isLikelyAudio) {
    const duration = await getAudioDurationSec(uri);
    return !(duration && Number.isFinite(duration) && duration > 0);
  }

  return await new Promise<boolean>((resolve) => {
    Image.getSize(
      uri,
      () => resolve(false),
      () => resolve(true),
    );
  });
}

async function getAudioDurationSec(uri: string): Promise<number | null> {
  let sound: Audio.Sound | null = null;
  try {
    const created = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: false },
      undefined,
      false,
    );
    sound = created.sound;
    const status = await sound.getStatusAsync();
    if (status.isLoaded && status.durationMillis) {
      return status.durationMillis / 1000;
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
  const params = useLocalSearchParams<{
    projectId?: string;
    localProjectId?: string;
    title?: string;
    photoUri?: string;
    photoName?: string;
    audioUri?: string;
    audioName?: string;
    aspectRatio?: AspectRatio;
    trimStart?: string;
    trimEnd?: string;
    returnToEditor?: string;
  }>();

  const projectId = firstParam(params.projectId);
  const initialLocalProjectId = firstParam(params.localProjectId) || null;
  const existingProjectId = asProjectId(projectId);
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const { isLocalGuest } = useLocalSession();
  const paramTitle = firstParam(params.title)?.trim() || "";
  const initialProjectTitle =
    paramTitle || DEFAULT_PROJECT_TITLE;
  const paramPhotoUri = decodeUriParam(firstParam(params.photoUri));
  const paramAudioUri = decodeUriParam(firstParam(params.audioUri));
  const paramPhotoName = firstParam(params.photoName);
  const paramAudioName = firstParam(params.audioName);
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
  const photoUri = paramPhotoUri || projectDetails?.photoUri || "";
  const audioUri = paramAudioUri || projectDetails?.audioUri || "";
  const photoName =
    paramPhotoName ||
    projectDetails?.photoName ||
    fallbackMediaNameFromUri(photoUri, "Photo");
  const audioName =
    paramAudioName ||
    projectDetails?.audioName ||
    fallbackMediaNameFromUri(audioUri, "Audio");
  const initialAspectRatio = parseAspectRatioParam(params.aspectRatio);
  const initialTrimStart = parseNumberParam(params.trimStart, 0);
  const initialTrimEndRaw = parseNumberParam(params.trimEnd, 30);
  const initialTrimEnd =
    initialTrimEndRaw > initialTrimStart
      ? initialTrimEndRaw
      : initialTrimStart + 30;

  const createProject = useMutation(api.projects.create);
  const updateProject = useMutation(api.projects.update);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(initialAspectRatio);
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
  const [forceAutosaveTick, setForceAutosaveTick] = useState(0);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
          return await createProject({
            title: normalizedTitle,
            aspectRatio,
            photoUri,
            photoName,
            audioUri,
            audioName,
            trimStart: roundedTrimStart,
            trimEnd: roundedTrimEnd,
            templateId: "spinning-cd",
          });
        } catch (error) {
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
        templateId: "spinning-cd",
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

  const minTrimDuration = Math.min(15, Math.max(audioDurationSec, 1));
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

  const stageWidth = Math.min(SCREEN_WIDTH - STAGE_HORIZONTAL_PADDING, 440);
  const stageHeight = Math.min(
    Math.max(stageWidth * (aspectRatio === "9:16" ? 1.4 : 1.2), 460),
    SCREEN_HEIGHT * 0.72,
  );
  const stageVinylSize = stageWidth * 1.42;

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
    }
    setEditorSaveStatus("saving");

    autosaveTimerRef.current = setTimeout(async () => {
      try {
        if (isLocalGuest && currentLocalProjectId) {
          await upsertLocalProject({
            id: currentLocalProjectId,
            title: normalizedTitle,
            templateId: "spinning-cd",
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
          await updateProject({
            projectId: currentProjectId,
            title: normalizedTitle,
            aspectRatio,
            trimStart: roundedTrimStart,
            trimEnd: roundedTrimEnd,
            photoUri,
            photoName,
            audioUri,
            audioName,
          });
        } else {
          return;
        }
        lastSavedSnapshotRef.current = nextSnapshot;
        setEditorSaveStatus("saved");
        track("project_autosave_succeeded", {
          projectId: trackedProjectId,
        });
      } catch {
        setEditorSaveStatus("error");
        track("project_autosave_failed", {
          projectId: trackedProjectId,
        });
      }
    }, 700);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [
    currentProjectId,
    currentLocalProjectId,
    isLocalGuest,
    shouldWaitForProjectMedia,
    forceAutosaveTick,
    projectTitle,
    aspectRatio,
    trimStart,
    trimEnd,
    photoUri,
    photoName,
    audioUri,
    audioName,
    track,
    upsertLocalProject,
    updateProject,
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
        if (isLocalGuest) {
          await createLocalDraftProject();
        } else {
          await createDraftProject();
        }
      } finally {
        router.replace("/(tabs)" as const);
      }
    })();
  }, [isLocalGuest, createLocalDraftProject, createDraftProject, router]);

  const handleSwapMedia = useCallback(
    (initialTab: "photo" | "audio") => {
      router.push({
        pathname: "/create/picker",
        params: {
          projectId: currentProjectId ? String(currentProjectId) : "",
          localProjectId: currentLocalProjectId ?? "",
          title: projectTitle,
          photoUri: encodeUriParam(photoUri),
          photoName,
          audioUri: encodeUriParam(audioUri),
          audioName,
          aspectRatio,
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
      trimStart,
      trimEnd,
    ],
  );

  const canExport =
    !!photoUri &&
    !!audioUri &&
    !missingFiles.photo &&
    !missingFiles.audio &&
    !isCheckingFiles;

  const handleExport = useCallback(() => {
    if (!canExport) {
      return;
    }
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
      },
    });
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
  ]);

  const trimmedDuration = Math.max(0, trimEnd - trimStart);
  const showMissingNotice = !isCheckingFiles && (missingFiles.photo || missingFiles.audio);
  const trackTitle = displayMediaLabel(audioName, "Untitled track");
  const subtitle = projectTitle.trim() || DEFAULT_PROJECT_TITLE;
  const playbackLabel = isPlaying ? "Now Playing" : "Paused";

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

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          onPress={handleCloseEditor}
          style={styles.headerButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={24} color={colors.dark.text} />
        </Pressable>

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
          {isCheckingFiles ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.exportText}>Export</Text>
          )}
        </Pressable>
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

      <View style={styles.previewContainer}>
        <SpinningCdTemplateStage
          width={stageWidth}
          height={stageHeight}
          vinylSize={stageVinylSize}
          photoUri={photoUri && !missingFiles.photo ? photoUri : null}
          isPlaying={isPlaying}
          playbackLabel={playbackLabel}
          trackTitle={trackTitle}
          subtitle={subtitle}
          onTogglePlay={handlePlayPause}
        />
      </View>

      <View style={styles.controls}>
        <Text style={styles.timestamp}>
          {formatClock(previewPositionSec)} / {formatClock(trimmedDuration)}
        </Text>

        <AspectRatioToggle value={aspectRatio} onChange={setAspectRatio} />
      </View>

      <View style={styles.mediaChips}>
        <Pressable
          style={[styles.chip, missingFiles.photo && styles.chipMissing]}
          onPress={() => handleSwapMedia("photo")}
          accessibilityLabel={`Photo: ${photoName}. Tap to change.`}
          accessibilityRole="button"
        >
          <Ionicons
            name={missingFiles.photo ? "warning" : "image"}
            size={16}
            color={missingFiles.photo ? colors.accent.warning : colors.accent.primary}
          />
          <Text style={styles.chipText} numberOfLines={1}>
            {photoName}
          </Text>
          <Ionicons
            name="swap-horizontal"
            size={14}
            color={colors.dark.textSecondary}
          />
        </Pressable>

        <Pressable
          style={[styles.chip, missingFiles.audio && styles.chipMissing]}
          onPress={() => handleSwapMedia("audio")}
          accessibilityLabel={`Audio: ${audioName}. Tap to change.`}
          accessibilityRole="button"
        >
          <Ionicons
            name={missingFiles.audio ? "warning" : "musical-note"}
            size={16}
            color={missingFiles.audio ? colors.accent.warning : colors.accent.primary}
          />
          <Text style={styles.chipText} numberOfLines={1}>
            {audioName}
          </Text>
          <Ionicons
            name="swap-horizontal"
            size={14}
            color={colors.dark.textSecondary}
          />
        </Pressable>
      </View>

      <View style={styles.trimmerSection}>
        <Text style={styles.sectionLabel}>Trim Audio</Text>
        <AudioTrimmer
          durationSec={audioDurationSec}
          startSec={trimStart}
          endSec={trimEnd}
          onTrimChange={handleTrimChange}
          isPlaying={isPlaying}
          playbackProgressSec={previewPositionSec}
          onTogglePlay={handlePlayPause}
          minDuration={minTrimDuration}
          maxDuration={maxTrimDuration}
        />
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
    justifyContent: "space-between",
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
  headerTitle: {
    ...typography.body,
    fontWeight: "600",
    color: colors.dark.text,
    maxWidth: "88%",
  },
  headerTitleButton: {
    flex: 1,
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    marginHorizontal: spacing.sm,
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
    color: "#FFFFFF",
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  turntableStage: {
    width: "100%",
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: "#BCBEC2",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 10,
  },
  stageBackdropImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.26,
  },
  stageBackdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(196,198,204,0.88)",
  },
  stageHaloTop: {
    position: "absolute",
    top: -90,
    right: -72,
    width: 260,
    height: 220,
    borderRadius: 130,
    backgroundColor: "rgba(255,255,255,0.4)",
    transform: [{ rotate: "-12deg" }],
  },
  stageHaloBottom: {
    position: "absolute",
    bottom: -110,
    left: -40,
    width: 300,
    height: 210,
    borderRadius: 160,
    backgroundColor: "rgba(255,255,255,0.36)",
    transform: [{ rotate: "15deg" }],
  },
  stageBottomShade: {
    position: "absolute",
    left: -70,
    right: -70,
    bottom: 0,
    height: 210,
    borderTopLeftRadius: 240,
    borderTopRightRadius: 240,
    backgroundColor: "rgba(18,18,24,0.18)",
  },
  stageVinylWrap: {
    position: "absolute",
  },
  tonearmPivot: {
    position: "absolute",
    top: 30,
    right: 28,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(122,123,129,0.25)",
  },
  tonearmArm: {
    position: "absolute",
    top: 56,
    right: 58,
    width: 10,
    height: 196,
    borderRadius: radius.full,
    backgroundColor: "#CED1D4",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.28)",
  },
  tonearmHead: {
    position: "absolute",
    top: 244,
    right: 45,
    width: 26,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#24252B",
    transform: [{ rotate: "26deg" }],
  },
  stageTextBlock: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: 94,
    gap: spacing.xs,
  },
  nowPlayingLabel: {
    ...typography.body,
    color: "#FFFFFF",
    fontSize: 32,
    lineHeight: 34,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  trackTitle: {
    ...typography.body,
    color: "rgba(255,255,255,0.96)",
    fontSize: 18,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  trackSubtitlePill: {
    alignSelf: "flex-start",
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  trackSubtitle: {
    ...typography.caption,
    color: "rgba(21,22,26,0.9)",
    fontSize: 14,
    fontWeight: "700",
  },
  stageTransport: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
  },
  stageTransportSpacer: {
    flex: 1,
  },
  stageControlPill: {
    minWidth: 56,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#1E1F24",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  stageControlPillPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },
  stageControlPillGhost: {
    marginLeft: spacing.sm,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    gap: spacing.md,
  },
  timestamp: {
    ...typography.caption,
    color: colors.dark.textSecondary,
    fontVariant: ["tabular-nums"],
  },
  mediaChips: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  chip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.dark.surface,
  },
  chipMissing: {
    borderWidth: 1,
    borderColor: "rgba(255,149,0,0.5)",
  },
  chipText: {
    ...typography.caption,
    color: colors.dark.text,
    flex: 1,
  },
  trimmerSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.dark.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
