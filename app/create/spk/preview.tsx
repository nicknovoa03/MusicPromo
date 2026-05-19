import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { type ViewShotRef } from "react-native-view-shot";
import * as MediaLibrary from "expo-media-library";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { colors, typography, spacing, radius } from "@/constants/tokens";
import { normalizeMediaUri } from "@/lib/mediaUri";
import { useLocalSession } from "@/providers/localSession";
import { getLocalArtistProfile, type LocalArtistProfile } from "@/lib/localProfile";
import { SpkCoverSlide } from "@/components/spk/SpkCoverSlide";
import { SpkTrackDetailsSlide } from "@/components/spk/SpkTrackDetailsSlide";
import { SpkVisionSlide } from "@/components/spk/SpkVisionSlide";
import { SpkBioSlide } from "@/components/spk/SpkBioSlide";
import { SpkExportCapture } from "@/components/spk/SpkExportCapture";
import { SpkFlowHeader } from "@/components/spk/SpkFlowHeader";
import {
  SpkBackgroundStudio,
  SPK_EDITORIAL_PRESETS,
} from "@/components/spk/SpkBackgroundStudio";
import type { BackgroundOption } from "@/components/create/background/types";
import {
  buildPhotoMatchedBackgroundOptions,
  mergeBackgroundPresets,
} from "@/components/create/background/photoMatchedBackground";
import { useSpkClose } from "@/hooks/useSpkClose";
import { useSpkWizardBack } from "@/hooks/useSpkWizardBack";
import { useSpkScreenParams } from "@/hooks/useSpkScreenParams";
import { useSpkDraft } from "@/providers/SpkDraftContext";
import { saveSpkDraftLocally } from "@/lib/spkDraft";
import {
  formatSpkReleaseDateLabel,
  normalizeSpkReleaseDateStored,
} from "@/lib/spkReleaseDate";
import { upsertLocalProject } from "@/lib/localProjects";
import {
  copyCaptureToNamedSpkExport,
  SPK_EXPORT_SLIDE_IDENTIFIERS,
} from "@/lib/spkExportFileName";
import { SPK_SLIDE_HEIGHT, SPK_SLIDE_WIDTH } from "@/lib/spkSlideDimensions";

const SLIDE_COUNT = 4;

const SLIDE_LABELS = ["Cover", "Track Details", "Vision", "Bio"];

const DEFAULT_THEME_COLOR = "#0E1014";

export default function SpkPreviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isLocalGuest } = useLocalSession();
  const { isAuthenticated } = useConvexAuth();

  useSpkScreenParams("preview");
  const {
    draft,
    mergeDraft,
    projectId: activeProjectId,
    localProjectId: activeLocalProjectId,
    setProjectId: setActiveProjectId,
    setLocalProjectId: setActiveLocalProjectId,
    isExistingProject,
    getDraftSnapshot,
  } = useSpkDraft();

  const customArtistName = draft.artistName?.trim() || null;
  const photoUri = draft.photoUri ?? null;
  const photoName = draft.photoName ?? null;
  const title = draft.title ?? "";
  const vision = draft.vision ?? "";
  const genre = draft.genre?.trim() || null;
  const bpm = draft.bpm?.trim() || null;
  const releaseDateStored = draft.releaseDate?.trim() || null;
  const releaseDate = releaseDateStored
    ? formatSpkReleaseDateLabel(releaseDateStored)
    : null;
  const trackLabel = draft.label?.trim() || null;
  const collaborators = draft.collaborators?.trim() || null;
  const templateName = draft.templateName ?? null;
  const clipDurationSec = draft.clipDurationSec ?? null;
  const linkedProjectId = draft.linkedProjectId ?? null;
  const themeColor =
    draft.themeColor?.trim() && draft.themeColor.startsWith("#")
      ? draft.themeColor
      : DEFAULT_THEME_COLOR;
  const customCoverUri = draft.customCoverUri ?? null;
  const innerBackgroundUri = draft.innerBackgroundUri ?? null;

  const convexUser = useQuery(api.users.current);
  const createProject = useMutation(api.projects.create);
  const updateProject = useMutation(api.projects.update);

  const [localProfile, setLocalProfile] = useState<LocalArtistProfile | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  /** True only after exporting in this session (not when reopening an exported project). */
  const [sessionExported, setSessionExported] = useState(false);
  const [firstSlideUri, setFirstSlideUri] = useState<string | null>(null);
  const [backgroundOptions, setBackgroundOptions] = useState<BackgroundOption[]>(
    SPK_EDITORIAL_PRESETS,
  );
  const [isPickingCover, setIsPickingCover] = useState(false);
  const [isPickingInner, setIsPickingInner] = useState(false);

  const coverImageUri = customCoverUri ?? photoUri;
  const artworkUriForColors = photoUri ?? coverImageUri;

  useEffect(() => {
    const sourceUri = artworkUriForColors?.trim();
    if (!sourceUri) {
      setBackgroundOptions(SPK_EDITORIAL_PRESETS);
      return;
    }

    let active = true;
    void buildPhotoMatchedBackgroundOptions(sourceUri).then((matched) => {
      if (!active) return;
      setBackgroundOptions(
        mergeBackgroundPresets(matched ?? [], SPK_EDITORIAL_PRESETS),
      );
    });
    return () => {
      active = false;
    };
  }, [artworkUriForColors]);

  useFocusEffect(
    useCallback(() => {
      if (!isLocalGuest) return;
      let active = true;
      getLocalArtistProfile().then((p) => {
        if (active) setLocalProfile(p);
      });
      return () => { active = false; };
    }, [isLocalGuest]),
  );

  const profileArtistName = isLocalGuest
    ? (localProfile?.artistName ?? "")
    : (convexUser?.artistName ?? convexUser?.name ?? "");
  const artistName = customArtistName ?? profileArtistName;

  const bio = isLocalGuest ? "" : (convexUser?.bio ?? "");

  const avatarImageUrl = isLocalGuest
    ? (localProfile?.avatarImageUrl ?? null)
    : (convexUser?.avatarImageUrl ?? convexUser?.avatarUrl ?? null);

  const heroImageUrl = isLocalGuest
    ? (localProfile?.heroImageUrl ?? null)
    : (convexUser?.heroImageUrl ?? null);

  const links = useMemo(
    () => (isLocalGuest ? localProfile?.links : convexUser?.links) ?? [],
    [isLocalGuest, localProfile?.links, convexUser?.links],
  );

  const profileIncomplete = !bio && links.length === 0;

  const { goBackOneStep, canStepBack } = useSpkWizardBack("preview");
  const { handleClose, isSaving } = useSpkClose({
    step: "preview",
    skipPersist: sessionExported,
    persistStatus: isExistingProject ? "exported" : "draft",
  });

  const exportRefs = [
    useRef<ViewShotRef>(null),
    useRef<ViewShotRef>(null),
    useRef<ViewShotRef>(null),
    useRef<ViewShotRef>(null),
  ] as const;

  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SPK_SLIDE_WIDTH);
    setCurrentSlide(Math.max(0, Math.min(SLIDE_COUNT - 1, index)));
  }, []);

  const pickBackgroundImage = useCallback(async (): Promise<string | null> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Allow access to your photo library to choose a background image.",
      );
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled || !result.assets[0]) return null;
    return normalizeMediaUri(result.assets[0].uri);
  }, []);

  const handlePickCoverImage = useCallback(async () => {
    if (isPickingCover) return;
    setIsPickingCover(true);
    try {
      const uri = await pickBackgroundImage();
      if (uri) mergeDraft({ customCoverUri: uri });
    } catch {
      Alert.alert("Could not open photo library", "Please try again.");
    } finally {
      setIsPickingCover(false);
    }
  }, [isPickingCover, pickBackgroundImage, mergeDraft]);

  const handlePickInnerBackground = useCallback(async () => {
    if (isPickingInner) return;
    setIsPickingInner(true);
    try {
      const uri = await pickBackgroundImage();
      if (uri) mergeDraft({ innerBackgroundUri: uri });
    } catch {
      Alert.alert("Could not open photo library", "Please try again.");
    } finally {
      setIsPickingInner(false);
    }
  }, [isPickingInner, pickBackgroundImage, mergeDraft]);

  const handleUseCoverForInnerSlides = useCallback(() => {
    if (!coverImageUri) {
      Alert.alert("No cover image", "Add a cover image first, or pick one for slides 2–4.");
      return;
    }
    mergeDraft({ innerBackgroundUri: coverImageUri });
  }, [coverImageUri, mergeDraft]);

  const handleSelectThemeColor = useCallback(
    (color: string) => {
      mergeDraft({ themeColor: color });
    },
    [mergeDraft],
  );

  const handleExport = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Allow access to your photo library to save the slides.",
        );
        return;
      }

      const exportDraft = getDraftSnapshot("preview");

      let exportProjectId =
        activeProjectId?.trim() || activeLocalProjectId?.trim() || "";

      if (!exportProjectId && isLocalGuest) {
        try {
          const savedId = await saveSpkDraftLocally({
            localProjectId: activeLocalProjectId,
            input: exportDraft,
            status: "draft",
            upsertLocalProject,
          });
          if (savedId) {
            exportProjectId = savedId;
            setActiveLocalProjectId(savedId);
          }
        } catch {
          // Non-fatal — fall back to session id below
        }
      } else if (!exportProjectId && isAuthenticated) {
        try {
          const createdId = await createProject({
            type: "spk",
            status: "draft",
            spkStep: "preview",
            title: title || undefined,
            vision: vision || undefined,
            photoUri: photoUri || undefined,
            photoName: photoName || undefined,
            genre: genre || undefined,
            bpm: bpm || undefined,
            releaseDate: releaseDateStored
              ? normalizeSpkReleaseDateStored(releaseDateStored)
              : undefined,
            label: trackLabel || undefined,
            collaborators: collaborators || undefined,
            themeColor,
            customCoverUri: customCoverUri || undefined,
            innerBackgroundUri: innerBackgroundUri || undefined,
            artistName: customArtistName || undefined,
            aspectRatio: "4:5",
          });
          exportProjectId = String(createdId);
          setActiveProjectId(exportProjectId);
        } catch {
          // Non-fatal — fall back to session id below
        }
      }

      if (!exportProjectId) {
        exportProjectId = `export-${Date.now()}`;
      }

      // Let off-screen export slides finish layout before capture.
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });

      const projectName = title.trim() || "untitled";
      const uris: string[] = [];
      for (let index = 0; index < exportRefs.length; index += 1) {
        const shot = exportRefs[index]?.current;
        if (!shot) {
          throw new Error("SPK export slide not ready");
        }
        const capturedUri = await shot.capture();
        const slideId =
          SPK_EXPORT_SLIDE_IDENTIFIERS[index] ?? `slide-${index + 1}`;
        uris.push(
          await copyCaptureToNamedSpkExport(
            capturedUri,
            projectName,
            slideId,
            exportProjectId,
          ),
        );
      }

      for (const uri of uris) {
        await MediaLibrary.saveToLibraryAsync(uri);
      }
      setFirstSlideUri(uris[0] ?? null);

      if (isLocalGuest) {
        try {
          const savedId = await saveSpkDraftLocally({
            localProjectId: activeLocalProjectId,
            input: exportDraft,
            status: "exported",
            upsertLocalProject,
          });
          if (savedId) setActiveLocalProjectId(savedId);
        } catch {
          // Non-fatal — slides are saved locally
        }
      } else if (isAuthenticated) {
        try {
          if (activeProjectId) {
            await updateProject({
              projectId: activeProjectId as Id<"projects">,
              status: "exported",
              spkStep: "preview",
              title: title || undefined,
              vision: vision || undefined,
              photoUri: photoUri || undefined,
              photoName: photoName || undefined,
              genre: genre || undefined,
              bpm: bpm || undefined,
              releaseDate: releaseDateStored
                ? normalizeSpkReleaseDateStored(releaseDateStored)
                : undefined,
              label: trackLabel || undefined,
              collaborators: collaborators || undefined,
              themeColor,
              customCoverUri: customCoverUri || undefined,
              innerBackgroundUri: innerBackgroundUri || undefined,
              artistName: customArtistName || undefined,
            });
          } else {
            const createdId = await createProject({
              type: "spk",
              status: "exported",
              spkStep: "preview",
              title: title || undefined,
              vision: vision || undefined,
              photoUri: photoUri || undefined,
              photoName: photoName || undefined,
              genre: genre || undefined,
              bpm: bpm || undefined,
              releaseDate: releaseDateStored
                ? normalizeSpkReleaseDateStored(releaseDateStored)
                : undefined,
              label: trackLabel || undefined,
              collaborators: collaborators || undefined,
              themeColor,
              customCoverUri: customCoverUri || undefined,
              innerBackgroundUri: innerBackgroundUri || undefined,
              artistName: customArtistName || undefined,
              aspectRatio: "4:5",
            });
            setActiveProjectId(String(createdId));
          }
        } catch {
          // Non-fatal — slides are saved, Convex write failure is secondary
        }
      }

      setSessionExported(true);
    } catch (err) {
      Alert.alert("Export failed", "Something went wrong. Please try again.");
      console.warn("SPK export error:", err);
    } finally {
      setIsExporting(false);
    }
  }, [
    isExporting,
    exportRefs,
    isLocalGuest,
    isAuthenticated,
    activeLocalProjectId,
    activeProjectId,
    createProject,
    updateProject,
    title,
    vision,
    photoUri,
    photoName,
    genre,
    bpm,
    releaseDateStored,
    trackLabel,
    collaborators,
    themeColor,
    customArtistName,
    customCoverUri,
    innerBackgroundUri,
    linkedProjectId,
    templateName,
    clipDurationSec,
    getDraftSnapshot,
    setActiveProjectId,
    setActiveLocalProjectId,
  ]);

  const handleShare = useCallback(async () => {
    if (!firstSlideUri) return;
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert("Sharing not available", "Sharing is not supported on this device.");
        return;
      }
      await Sharing.shareAsync(firstSlideUri, {
        mimeType: "image/jpeg",
        UTI: "public.jpeg",
      });
    } catch {
      Alert.alert("Share failed", "Could not open sharing. Please try again.");
    }
  }, [firstSlideUri]);

  const text = colors.dark.text;
  const secondary = colors.dark.textSecondary;
  const surface = colors.dark.surface;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <SpkFlowHeader
        title="Preview"
        stepLabel={sessionExported ? "Exported" : SLIDE_LABELS[currentSlide]}
        showBackButton={canStepBack}
        onBack={goBackOneStep}
        onExit={handleClose}
        exitAccessibilityLabel={sessionExported ? "Exit" : "Save and exit"}
        isSaving={isSaving}
      />

      <View style={styles.body}>
        <ScrollView
          style={styles.mainScroll}
          contentContainerStyle={[
            styles.mainScrollContent,
            sessionExported && styles.mainScrollContentExported,
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!sessionExported}
          keyboardShouldPersistTaps="handled"
        >
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
            scrollEventThrottle={16}
            style={[styles.swiper, { height: SPK_SLIDE_HEIGHT }]}
            contentContainerStyle={styles.swiperContent}
          >
        <View style={styles.slide}>
          <SpkCoverSlide
            width={SPK_SLIDE_WIDTH}
            height={SPK_SLIDE_HEIGHT}
            photoUri={coverImageUri}
            trackTitle={title}
          />
        </View>
        <View style={styles.slide}>
          <SpkTrackDetailsSlide
            width={SPK_SLIDE_WIDTH}
            height={SPK_SLIDE_HEIGHT}
            trackTitle={title}
            genre={genre}
            bpm={bpm}
            releaseDate={releaseDate}
            label={trackLabel}
            collaborators={collaborators}
            themeColor={themeColor}
            backgroundImageUri={innerBackgroundUri}
          />
        </View>
        <View style={styles.slide}>
          <SpkVisionSlide
            width={SPK_SLIDE_WIDTH}
            height={SPK_SLIDE_HEIGHT}
            vision={vision}
            artistName={artistName}
            themeColor={themeColor}
            backgroundImageUri={innerBackgroundUri}
          />
        </View>
        <View style={styles.slide}>
          <SpkBioSlide
            width={SPK_SLIDE_WIDTH}
            height={SPK_SLIDE_HEIGHT}
            artistName={artistName}
            avatarImageUrl={avatarImageUrl}
            heroImageUrl={heroImageUrl}
            bio={bio}
            links={links}
            themeColor={themeColor}
            backgroundImageUri={innerBackgroundUri}
          />
        </View>
          </ScrollView>

          <View style={styles.dots}>
            {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === currentSlide
                    ? styles.dotActive
                    : [styles.dotInactive, { backgroundColor: secondary }],
                ]}
              />
            ))}
          </View>

          {!sessionExported ? (
            <SpkBackgroundStudio
              coverImageUri={coverImageUri}
              innerBackgroundUri={innerBackgroundUri}
              themeColor={themeColor}
              backgroundOptions={backgroundOptions}
              hasCustomCover={Boolean(customCoverUri)}
              isPickingCover={isPickingCover}
              isPickingInner={isPickingInner}
              onPickCover={() => void handlePickCoverImage()}
              onPickInner={() => void handlePickInnerBackground()}
              onUseCoverForInner={handleUseCoverForInnerSlides}
              onClearInnerPhoto={() => mergeDraft({ innerBackgroundUri: null })}
              onResetCoverToArtwork={() => mergeDraft({ customCoverUri: null })}
              onSelectColor={handleSelectThemeColor}
            />
          ) : null}

          {!sessionExported && profileIncomplete ? (
            <Pressable
              style={[styles.nudge, { backgroundColor: surface }]}
              onPress={() => router.push("/profile")}
              accessibilityRole="button"
              accessibilityLabel="Edit profile to add bio and links"
            >
              <Ionicons name="person-circle-outline" size={16} color={secondary} />
              <Text style={[styles.nudgeText, { color: secondary }]}>
                Add a bio and social links to complete your press kit
              </Text>
              <Text style={[styles.nudgeAction, { color: text }]}>Edit</Text>
            </Pressable>
          ) : null}
        </ScrollView>

        <View
          style={[
            styles.footer,
            sessionExported && styles.footerExported,
            { paddingBottom: insets.bottom + spacing.sm },
          ]}
        >
          {sessionExported ? (
            <View style={styles.exportedPanel}>
              <View style={styles.exportSuccess}>
                <Ionicons name="checkmark-circle" size={22} color={colors.accent.primary} />
                <View style={styles.exportSuccessCopy}>
                  <Text style={styles.exportSuccessTitle}>Saved to Camera Roll</Text>
                  <Text style={[styles.exportSuccessSubtitle, { color: secondary }]}>
                    4 slides ready to share
                  </Text>
                </View>
              </View>
              <Pressable
                style={({ pressed }) => [styles.instagramButton, pressed && styles.pressed]}
                onPress={() => void handleShare()}
                accessibilityRole="button"
                accessibilityLabel="Share"
              >
                <Ionicons name="share-outline" size={20} color="#000000" />
                <Text style={styles.instagramButtonText}>Share</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.doneButton, pressed && styles.pressed]}
                onPress={() => router.replace("/")}
                accessibilityRole="button"
                accessibilityLabel="Done"
              >
                <Text style={[styles.doneButtonText, { color: secondary }]}>Done</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.exportButton,
                isExporting && styles.exportButtonDisabled,
                pressed && !isExporting && styles.pressed,
              ]}
              onPress={() => void handleExport()}
              disabled={isExporting}
              accessibilityRole="button"
              accessibilityLabel="Export carousel"
              accessibilityState={{ disabled: isExporting }}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color={colors.accent.onPrimary} />
              ) : (
                <Ionicons name="share-outline" size={20} color={colors.accent.onPrimary} />
              )}
              <Text style={styles.exportButtonText}>
                {isExporting ? "Exporting…" : "Export Carousel"}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      <SpkExportCapture
        exportRefs={[exportRefs[0], exportRefs[1], exportRefs[2], exportRefs[3]]}
        cover={{
          width: SPK_SLIDE_WIDTH,
          height: SPK_SLIDE_HEIGHT,
          photoUri: coverImageUri,
          trackTitle: title,
        }}
        track={{
          width: SPK_SLIDE_WIDTH,
          height: SPK_SLIDE_HEIGHT,
          trackTitle: title,
          genre,
          bpm,
          releaseDate,
          label: trackLabel,
          collaborators,
          themeColor,
          backgroundImageUri: innerBackgroundUri,
        }}
        vision={{
          width: SPK_SLIDE_WIDTH,
          height: SPK_SLIDE_HEIGHT,
          vision,
          artistName,
          themeColor,
          backgroundImageUri: innerBackgroundUri,
        }}
        bio={{
          width: SPK_SLIDE_WIDTH,
          height: SPK_SLIDE_HEIGHT,
          artistName,
          avatarImageUrl,
          heroImageUrl,
          bio,
          links,
          themeColor,
          backgroundImageUri: innerBackgroundUri,
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  mainScroll: {
    flex: 1,
  },
  mainScrollContent: {
    paddingBottom: spacing.sm,
  },
  mainScrollContentExported: {
    flexGrow: 1,
    justifyContent: "flex-start",
  },
  swiper: {
    flexShrink: 0,
  },
  swiperContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  slide: {
    width: SPK_SLIDE_WIDTH,
    height: SPK_SLIDE_HEIGHT,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: spacing.sm,
  },
  footerExported: {
    borderTopWidth: 0,
    paddingTop: 0,
  },
  exportedPanel: {
    gap: spacing.md,
  },
  exportSuccess: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  exportSuccessCopy: {
    gap: 2,
  },
  exportSuccessTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.dark.text,
    letterSpacing: -0.2,
  },
  exportSuccessSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  dot: {
    borderRadius: 100,
  },
  dotActive: {
    width: 20,
    height: 5,
    backgroundColor: "#FFFFFF",
  },
  dotInactive: {
    width: 5,
    height: 5,
    opacity: 0.4,
  },
  nudge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  nudgeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  nudgeAction: {
    fontSize: 12,
    fontWeight: "700",
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.dark.border,
    backgroundColor: "#000000",
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.accent.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    ...typography.button,
    color: colors.accent.onPrimary,
  },
  instagramButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.accent.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  instagramButtonText: {
    ...typography.button,
    color: "#000000",
  },
  doneButton: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  doneButtonText: {
    fontSize: 15,
    fontWeight: "500",
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
});
