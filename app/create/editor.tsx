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
import { useMutation, useQuery } from "convex/react";
import * as FileSystem from "expo-file-system/legacy";
import { Audio } from "expo-av";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { colors, typography, spacing, radius } from "@/constants/tokens";
import { AudioTrimmer } from "@/components/create/AudioTrimmer";
import {
  AspectRatioToggle,
  type AspectRatio,
} from "@/components/create/AspectRatioToggle";
import type { EventName } from "@/lib/analytics";
import { decodeUriParam, encodeUriParam, fileNameFromUri } from "@/lib/uri";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PREVIEW_PADDING = spacing.xl * 2;
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

function isGeneratedMediaName(value: string) {
  return /^media-\d+-\d+(\.[a-z0-9]{1,8})?$/i.test(value.trim());
}

function fallbackMediaNameFromUri(uri: string, fallback: "Photo" | "Audio") {
  const fromUri = fileNameFromUri(uri);
  if (!fromUri || isGeneratedMediaName(fromUri)) return fallback;
  return fromUri;
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

export default function EditorScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  const params = useLocalSearchParams<{
    projectId?: string;
    title?: string;
    photoUri?: string;
    photoName?: string;
    audioUri?: string;
    audioName?: string;
    aspectRatio?: AspectRatio;
    trimStart?: string;
    trimEnd?: string;
  }>();

  const projectId = firstParam(params.projectId);
  const existingProjectId = asProjectId(projectId);
  const paramTitle = firstParam(params.title)?.trim() || "";
  const initialProjectTitle =
    paramTitle || DEFAULT_PROJECT_TITLE;
  const paramPhotoUri = decodeUriParam(firstParam(params.photoUri));
  const paramAudioUri = decodeUriParam(firstParam(params.audioUri));
  const paramPhotoName = firstParam(params.photoName);
  const paramAudioName = firstParam(params.audioName);
  const projectDetails = useQuery(
    api.projects.getById,
    existingProjectId ? { projectId: existingProjectId } : "skip",
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

  const updateProject = useMutation(api.projects.update);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(initialAspectRatio);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trimStart, setTrimStart] = useState(initialTrimStart);
  const [trimEnd, setTrimEnd] = useState(initialTrimEnd);
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
  const shouldWaitForProjectMedia =
    !!existingProjectId &&
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
    track("preview_viewed", {
      hasPhoto: String(!!photoUri),
      hasAudio: String(!!audioUri),
      reopened: String(!!projectId),
    });
  }, [audioUri, photoUri, projectId, track]);

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
      if (!projectId) {
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
  }, [photoUri, audioUri, projectId, shouldWaitForProjectMedia]);

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
  const maxTrimDuration = Math.min(60, Math.max(audioDurationSec, minTrimDuration));

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

  const previewAspect = aspectRatio === "9:16" ? 9 / 16 : 1;
  const previewWidth = Math.min(
    SCREEN_WIDTH - PREVIEW_PADDING,
    aspectRatio === "1:1" ? 300 : 240,
  );
  const previewHeight = previewWidth / previewAspect;

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

  const handlePlayPause = useCallback(() => {
    // TODO(phase-2): replace this placeholder with real audio preview playback state.
    setIsPlaying((prev) => !prev);
  }, []);

  const handleOpenProjectNameModal = useCallback(() => {
    setProjectNameDraft(
      projectTitle === DEFAULT_PROJECT_TITLE ? "" : projectTitle,
    );
    setIsNameModalVisible(true);
    track("project_title_edit_opened", {
      reopened: String(!!existingProjectId),
    });
  }, [existingProjectId, projectTitle, track]);

  const handleCloseProjectNameModal = useCallback(() => {
    setIsNameModalVisible(false);
  }, []);

  const handleSaveProjectTitle = useCallback(() => {
    const nextTitle = projectNameDraft.trim();
    if (!nextTitle) return;
    if (nextTitle !== projectTitle) {
      setProjectTitle(nextTitle);
      track("project_title_updated", {
        reopened: String(!!existingProjectId),
      });
    }
    setIsNameModalVisible(false);
  }, [existingProjectId, projectNameDraft, projectTitle, track]);

  useEffect(() => {
    if (!existingProjectId || shouldWaitForProjectMedia) return;

    const roundedTrimStart = Math.round(trimStart * 100) / 100;
    const roundedTrimEnd = Math.round(trimEnd * 100) / 100;
    const normalizedTitle = projectTitle.trim() || DEFAULT_PROJECT_TITLE;
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
        projectId: String(existingProjectId),
      });
    }

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    setEditorSaveStatus("saving");

    autosaveTimerRef.current = setTimeout(async () => {
      try {
        await updateProject({
          projectId: existingProjectId,
          title: normalizedTitle,
          aspectRatio,
          trimStart: roundedTrimStart,
          trimEnd: roundedTrimEnd,
          photoUri,
          photoName,
          audioUri,
          audioName,
        });
        lastSavedSnapshotRef.current = nextSnapshot;
        setEditorSaveStatus("saved");
        track("project_autosave_succeeded", {
          projectId: String(existingProjectId),
        });
      } catch {
        setEditorSaveStatus("error");
        track("project_autosave_failed", {
          projectId: String(existingProjectId),
        });
      }
    }, 700);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [
    existingProjectId,
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
    updateProject,
  ]);

  useEffect(() => {
    if (!existingProjectId) return;

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
      projectId: String(existingProjectId),
      photoChanged: String(photoChanged),
      audioChanged: String(audioChanged),
    });
  }, [existingProjectId, photoUri, audioUri, track]);

  const handleSwapMedia = useCallback(
    (initialTab: "photo" | "audio") => {
      router.push({
        pathname: "/create/picker",
        params: {
          projectId: projectId ?? "",
          title: projectTitle,
          photoUri: encodeUriParam(photoUri),
          photoName,
          audioUri: encodeUriParam(audioUri),
          audioName,
          aspectRatio,
          trimStart: String(trimStart),
          trimEnd: String(trimEnd),
          initialTab,
        },
      });
    },
    [
      router,
      projectId,
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
        projectId: projectId ?? "",
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
    projectId,
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

  const saveStatusLabel =
    editorSaveStatus === "saving"
      ? "Saving..."
      : editorSaveStatus === "saved"
        ? "Saved"
        : editorSaveStatus === "error"
          ? "Save failed"
          : "";
  const saveStatusIcon =
    editorSaveStatus === "saving"
      ? "sync-outline"
      : editorSaveStatus === "saved"
        ? "checkmark-circle-outline"
        : "alert-circle-outline";
  const saveStatusColor =
    editorSaveStatus === "error"
      ? colors.accent.warning
      : colors.dark.textSecondary;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
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

      {existingProjectId ? (
        <Pressable
          style={styles.saveStatusRow}
          onPress={() => {
            if (editorSaveStatus !== "error") return;
            setForceAutosaveTick((tick) => tick + 1);
          }}
          disabled={editorSaveStatus !== "error"}
          accessibilityLabel={
            editorSaveStatus === "error" ? "Retry project save" : "Project saved status"
          }
          accessibilityRole={editorSaveStatus === "error" ? "button" : "text"}
        >
          <Ionicons
            name={saveStatusIcon}
            size={14}
            color={saveStatusColor}
          />
          <Text style={[styles.saveStatusText, { color: saveStatusColor }]}>
            {saveStatusLabel}
          </Text>
        </Pressable>
      ) : null}

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
        <View
          style={[
            styles.preview,
            { width: previewWidth, height: previewHeight },
          ]}
        >
          {photoUri && !missingFiles.photo ? (
            <Image
              source={{ uri: photoUri }}
              style={styles.previewImage}
              resizeMode="cover"
              accessibilityLabel="Photo preview"
            />
          ) : (
            <Ionicons
              name="image-outline"
              size={48}
              color={colors.dark.textSecondary}
            />
          )}

          <View style={styles.cdOverlay}>
            <View style={styles.cdRing}>
              <View style={styles.cdCenter} />
            </View>
            <Text style={styles.cdLabel}>Spinning CD preview</Text>
          </View>
        </View>
      </View>

      <View style={styles.controls}>
        <Pressable
          onPress={handlePlayPause}
          style={styles.playButton}
          accessibilityLabel={isPlaying ? "Pause" : "Play"}
          accessibilityRole="button"
        >
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={22}
            color={colors.dark.text}
          />
        </Pressable>

        <Text style={styles.timestamp}>
          {/* TODO(phase-2): sync this timestamp to real audio playback position. */}
          0:00 / {Math.floor(trimmedDuration / 60)}:
          {String(Math.floor(trimmedDuration % 60)).padStart(2, "0")}
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
  saveStatusRow: {
    minHeight: 22,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: -2,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  saveStatusText: {
    ...typography.caption,
    fontWeight: "500",
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
    paddingVertical: spacing.md,
  },
  preview: {
    backgroundColor: colors.dark.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  previewImage: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
  },
  cdOverlay: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  cdRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  cdCenter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  cdLabel: {
    ...typography.caption,
    color: "rgba(255,255,255,0.5)",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.dark.surface,
    alignItems: "center",
    justifyContent: "center",
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
