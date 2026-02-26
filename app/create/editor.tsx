import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { usePostHog } from "posthog-react-native";
import { colors, typography, spacing, radius } from "@/constants/tokens";
import {
  AudioTrimmer,
} from "@/components/create/AudioTrimmer";
import {
  AspectRatioToggle,
  type AspectRatio,
} from "@/components/create/AspectRatioToggle";
import type { EventName } from "@/lib/analytics";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PREVIEW_PADDING = spacing.xl * 2;

const PLACEHOLDER_DURATION = 180;

export default function EditorScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  const params = useLocalSearchParams<{
    photoUri: string;
    photoName: string;
    audioUri: string;
    audioName: string;
  }>();

  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const [isPlaying, setIsPlaying] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(30);

  const track = useCallback(
    (event: EventName, props?: Record<string, string>) => {
      posthog?.capture(event, props);
    },
    [posthog],
  );

  useEffect(() => {
    track("preview_viewed", {
      hasPhoto: String(!!params.photoUri),
      hasAudio: String(!!params.audioUri),
    });
  }, []);

  const previewAspect = aspectRatio === "9:16" ? 9 / 16 : 1;
  const previewWidth = Math.min(
    SCREEN_WIDTH - PREVIEW_PADDING,
    aspectRatio === "1:1" ? 300 : 240,
  );
  const previewHeight = previewWidth / previewAspect;

  const handleTrimChange = useCallback((start: number, end: number) => {
    setTrimStart(start);
    setTrimEnd(end);
  }, []);

  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleSwapPhoto = useCallback(() => {
    router.back();
  }, [router]);

  const handleSwapAudio = useCallback(() => {
    router.back();
  }, [router]);

  const handleExport = useCallback(() => {
    router.push({
      pathname: "/create/rendering",
      params: {
        photoUri: params.photoUri,
        audioUri: params.audioUri,
        trimStart: String(trimStart),
        trimEnd: String(trimEnd),
        aspectRatio,
      },
    });
  }, [router, params.photoUri, params.audioUri, trimStart, trimEnd, aspectRatio]);

  const trimmedDuration = trimEnd - trimStart;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.headerButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={24} color={colors.dark.text} />
        </Pressable>

        <Text style={styles.headerTitle} numberOfLines={1}>
          New Project
        </Text>

        <Pressable
          onPress={handleExport}
          style={({ pressed }) => [
            styles.exportButton,
            pressed && styles.exportButtonPressed,
          ]}
          accessibilityLabel="Export video"
          accessibilityRole="button"
        >
          <Text style={styles.exportText}>Export</Text>
        </Pressable>
      </View>

      {/* Preview area */}
      <View style={styles.previewContainer}>
        <View
          style={[
            styles.preview,
            { width: previewWidth, height: previewHeight },
          ]}
        >
          {params.photoUri ? (
            <Image
              source={{ uri: params.photoUri }}
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

          {/* Spinning CD overlay placeholder */}
          <View style={styles.cdOverlay}>
            <View style={styles.cdRing}>
              <View style={styles.cdCenter} />
            </View>
            <Text style={styles.cdLabel}>Spinning CD preview</Text>
          </View>
        </View>
      </View>

      {/* Playback controls */}
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
          0:00 / {Math.floor(trimmedDuration / 60)}:
          {String(Math.floor(trimmedDuration % 60)).padStart(2, "0")}
        </Text>

        <AspectRatioToggle value={aspectRatio} onChange={setAspectRatio} />
      </View>

      {/* Media chips — allow swapping */}
      <View style={styles.mediaChips}>
        <Pressable
          style={styles.chip}
          onPress={handleSwapPhoto}
          accessibilityLabel={`Photo: ${params.photoName}. Tap to change.`}
          accessibilityRole="button"
        >
          <Ionicons
            name="image"
            size={16}
            color={colors.accent.primary}
          />
          <Text style={styles.chipText} numberOfLines={1}>
            {params.photoName ?? "Photo"}
          </Text>
          <Ionicons
            name="swap-horizontal"
            size={14}
            color={colors.dark.textSecondary}
          />
        </Pressable>

        <Pressable
          style={styles.chip}
          onPress={handleSwapAudio}
          accessibilityLabel={`Audio: ${params.audioName}. Tap to change.`}
          accessibilityRole="button"
        >
          <Ionicons
            name="musical-note"
            size={16}
            color={colors.accent.primary}
          />
          <Text style={styles.chipText} numberOfLines={1}>
            {params.audioName ?? "Audio"}
          </Text>
          <Ionicons
            name="swap-horizontal"
            size={14}
            color={colors.dark.textSecondary}
          />
        </Pressable>
      </View>

      {/* Audio trimmer */}
      <View style={styles.trimmerSection}>
        <Text style={styles.sectionLabel}>Trim Audio</Text>
        <AudioTrimmer
          durationSec={PLACEHOLDER_DURATION}
          startSec={trimStart}
          endSec={trimEnd}
          onTrimChange={handleTrimChange}
          minDuration={15}
          maxDuration={60}
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
    flex: 1,
    textAlign: "center",
    marginHorizontal: spacing.sm,
  },
  exportButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.accent.primary,
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
