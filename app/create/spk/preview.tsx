import { useState, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  Alert,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import * as Sharing from "expo-sharing";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { captureRef } from "react-native-view-shot";
import * as MediaLibrary from "expo-media-library";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { colors, typography, spacing, radius } from "@/constants/tokens";
import { decodeUriParam, encodeUriParam } from "@/lib/uri";
import { normalizeMediaUri } from "@/lib/mediaUri";
import { useLocalSession } from "@/providers/localSession";
import { getLocalArtistProfile, type LocalArtistProfile } from "@/lib/localProfile";
import { SpkCoverSlide } from "@/components/spk/SpkCoverSlide";
import { SpkTrackDetailsSlide } from "@/components/spk/SpkTrackDetailsSlide";
import { SpkVisionSlide } from "@/components/spk/SpkVisionSlide";
import { SpkBioSlide } from "@/components/spk/SpkBioSlide";

const SLIDE_COUNT = 4;
const SLIDE_WIDTH = Dimensions.get("window").width;
const SLIDE_HEIGHT = Math.round(SLIDE_WIDTH * (5 / 4));

function firstParam(p: string | string[] | undefined): string {
  return Array.isArray(p) ? (p[0] ?? "") : (p ?? "");
}

const SLIDE_LABELS = ["Cover", "Track Details", "Vision", "Bio"];

export default function SpkPreviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isLocalGuest } = useLocalSession();
  const { isAuthenticated } = useConvexAuth();

  const params = useLocalSearchParams<{
    artistName: string;
    photoUri: string;
    photoName: string;
    title: string;
    linkedProjectId: string;
    templateName: string;
    clipDurationSec: string;
    vision: string;
    projectId: string;
    isExistingProject: string;
  }>();

  const customArtistName = firstParam(params.artistName) || null;
  const photoUri = normalizeMediaUri(decodeUriParam(firstParam(params.photoUri)));
  const photoName = firstParam(params.photoName);
  const title = firstParam(params.title);
  const vision = firstParam(params.vision);
  const templateName = firstParam(params.templateName) || null;
  const clipDurationSec = params.clipDurationSec ? Number(firstParam(params.clipDurationSec)) || null : null;
  const existingProjectId = firstParam(params.projectId) || null;
  const isExisting = firstParam(params.isExistingProject) === "1";

  const convexUser = useQuery(api.users.current);
  const createProject = useMutation(api.projects.create);
  const updateProject = useMutation(api.projects.update);

  const [localProfile, setLocalProfile] = useState<LocalArtistProfile | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [isExported, setIsExported] = useState(false);
  const [firstSlideUri, setFirstSlideUri] = useState<string | null>(null);

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

  const bio = isLocalGuest
    ? ""
    : (convexUser?.bio ?? "");

  const avatarImageUrl = isLocalGuest
    ? (localProfile?.avatarImageUrl ?? null)
    : (convexUser?.avatarImageUrl ?? convexUser?.avatarUrl ?? null);

  const heroImageUrl = isLocalGuest
    ? (localProfile?.heroImageUrl ?? null)
    : (convexUser?.heroImageUrl ?? null);

  const links = useMemo(
    () =>
      (isLocalGuest ? localProfile?.links : convexUser?.links) ?? [],
    [isLocalGuest, localProfile?.links, convexUser?.links],
  );

  const profileIncomplete = !bio && links.length === 0;

  // Refs for capture — one per slide
  const slideRefs = [
    useRef<View>(null),
    useRef<View>(null),
    useRef<View>(null),
    useRef<View>(null),
  ];

  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SLIDE_WIDTH);
    setCurrentSlide(Math.max(0, Math.min(SLIDE_COUNT - 1, index)));
  }, []);

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

      const uris: string[] = [];
      for (const ref of slideRefs) {
        const uri = await captureRef(ref, { format: "jpg", quality: 0.93 });
        uris.push(uri);
      }

      for (const uri of uris) {
        await MediaLibrary.saveToLibraryAsync(uri);
      }
      setFirstSlideUri(uris[0] ?? null);

      if (isAuthenticated) {
        try {
          if (isExisting && existingProjectId) {
            await updateProject({
              projectId: existingProjectId as Id<"projects">,
              status: "exported",
            });
          } else {
            await createProject({
              type: "spk",
              title: title || undefined,
              vision: vision || undefined,
              photoUri: photoUri || undefined,
              photoName: photoName || undefined,
              aspectRatio: "1:1",
            });
          }
        } catch {
          // Non-fatal — slides are saved, Convex write failure is secondary
        }
      }

      setIsExported(true);
    } catch (err) {
      Alert.alert("Export failed", "Something went wrong. Please try again.");
      console.warn("SPK export error:", err);
    } finally {
      setIsExporting(false);
    }
  }, [
    isExporting,
    slideRefs,
    isAuthenticated,
    isExisting,
    existingProjectId,
    createProject,
    updateProject,
    title,
    vision,
    photoUri,
    photoName,
    router,
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
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={22} color={text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: text }]}>Preview</Text>
        <Text style={[styles.slideLabel, { color: secondary }]}>
          {SLIDE_LABELS[currentSlide]}
        </Text>
      </View>

      {/* Slide swiper */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.swiper}
        contentContainerStyle={styles.swiperContent}
      >
        <View ref={slideRefs[0]} style={styles.slide} collapsable={false}>
          <SpkCoverSlide
            width={SLIDE_WIDTH}
            height={SLIDE_HEIGHT}
            photoUri={photoUri}
            artistName={artistName}
            trackTitle={title}
            links={links}
          />
        </View>
        <View ref={slideRefs[1]} style={styles.slide} collapsable={false}>
          <SpkTrackDetailsSlide
            width={SLIDE_WIDTH}
            height={SLIDE_HEIGHT}
            trackTitle={title}
            templateName={templateName}
            clipDurationSec={clipDurationSec}
          />
        </View>
        <View ref={slideRefs[2]} style={styles.slide} collapsable={false}>
          <SpkVisionSlide
            width={SLIDE_WIDTH}
            height={SLIDE_HEIGHT}
            vision={vision}
            artistName={artistName}
          />
        </View>
        <View ref={slideRefs[3]} style={styles.slide} collapsable={false}>
          <SpkBioSlide
            width={SLIDE_WIDTH}
            height={SLIDE_HEIGHT}
            artistName={artistName}
            avatarImageUrl={avatarImageUrl}
            heroImageUrl={heroImageUrl}
            bio={bio}
            links={links}
          />
        </View>
      </ScrollView>

      {/* Dot pagination */}
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

      {/* Profile nudge */}
      {profileIncomplete ? (
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

      {/* Footer: export or post-export share */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        {isExported ? (
          <>
            <View style={styles.savedConfirm}>
              <Ionicons name="checkmark-circle" size={16} color={colors.accent.primary} />
              <Text style={[styles.savedConfirmText, { color: secondary }]}>
                4 slides saved to Camera Roll
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.instagramButton, pressed && styles.pressed]}
              onPress={() => void handleShare()}
              accessibilityRole="button"
              accessibilityLabel="Share to Instagram"
            >
              <Ionicons name="logo-instagram" size={20} color="#000000" />
              <Text style={styles.instagramButtonText}>Share to Instagram</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.doneButton, pressed && styles.pressed]}
              onPress={() => router.replace("/")}
              accessibilityRole="button"
              accessibilityLabel="Done"
            >
              <Text style={[styles.doneButtonText, { color: secondary }]}>Done</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.exportButton,
              isExporting && styles.exportButtonDisabled,
              pressed && !isExporting && styles.pressed,
            ]}
            onPress={handleExport}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -spacing.xs,
  },
  headerTitle: {
    ...typography.body,
    fontWeight: "600",
    flex: 1,
  },
  slideLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  swiper: {
    height: SLIDE_HEIGHT,
    flexShrink: 0,
  },
  swiperContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  slide: {
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 14,
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
  savedConfirm: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  savedConfirmText: {
    fontSize: 13,
    fontWeight: "500",
  },
  instagramButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.accent.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
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
