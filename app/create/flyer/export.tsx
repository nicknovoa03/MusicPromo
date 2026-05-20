import { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Share,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as MediaLibrary from "expo-media-library";
import ViewShot, { type ViewShotRef } from "react-native-view-shot";
import { colors, spacing, radius } from "@/constants/tokens";
import { FlyerTemplateView } from "@/components/flyer/FlyerTemplateView";
import { useFlyerDraft } from "@/providers/FlyerDraftContext";
import { useFlyerScreenParams } from "@/hooks/useFlyerScreenParams";
import { useFlyerClose } from "@/hooks/useFlyerClose";
import {
  flyerExportSize,
  FLYER_CAPTURE_QUALITY,
  previewSize,
} from "@/lib/flyerDimensions";
import type { FlyerAspectRatio, FlyerExportFormat } from "@/lib/flyerDraft";
import { renderFlyerVideo } from "@/lib/renderFlyerVideo";

const INSTAGRAM_GRADIENT = ["#F58529", "#DD2A7B", "#8134AF"] as const;

export default function FlyerExportScreen() {
  const router = useRouter();
  useFlyerScreenParams("export");
  const { draft, mergeDraft } = useFlyerDraft();
  const { persistDraft } = useFlyerClose({ step: "export", skipPersist: true });
  const exportRef = useRef<ViewShotRef>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [progress, setProgress] = useState(0);

  const aspectRatio = draft.aspectRatio ?? "9:16";
  const exportFormat = draft.exportFormat ?? "image";
  const exportSize = flyerExportSize(aspectRatio);
  const preview = previewSize(aspectRatio, 180);
  const trimStart = draft.trimStart ?? 0;
  const trimEnd = draft.trimEnd ?? trimStart + 10;
  const clipSec = Math.max(1, trimEnd - trimStart);

  const captureImage = useCallback(async () => {
    const ref = exportRef.current;
    if (!ref?.capture) {
      throw new Error("Export view not ready");
    }
    return ref.capture();
  }, []);

  const saveToCameraRoll = useCallback(async () => {
    setIsExporting(true);
    setProgress(0);
    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission needed",
          "Allow photo library access to save your flyer.",
        );
        return;
      }

      if (exportFormat === "video") {
        if (Platform.OS === "web") {
          Alert.alert(
            "Video export unavailable",
            "Video export requires a native build. On web, switch to image export or test on your phone.",
          );
          return;
        }
        if (!draft.audioUri) {
          Alert.alert(
            "Audio required",
            "Add an audio clip in the editor to export video.",
          );
          return;
        }
        const imageUri = await captureImage();
        setProgress(15);
        const videoUri = await renderFlyerVideo({
          imageUri,
          audioUri: draft.audioUri,
          trimStart,
          trimEnd,
          aspectRatio,
          outputFileName: draft.eventName ?? "Event Flyer",
          onProgress: setProgress,
        });
        await MediaLibrary.saveToLibraryAsync(videoUri);
        mergeDraft({ exportedVideoUri: videoUri, exportFormat: "video" });
        await persistDraft(
          { exportedVideoUri: videoUri, step: "export" },
          "exported",
        );
      } else {
        const uri = await captureImage();
        await MediaLibrary.saveToLibraryAsync(uri);
        await persistDraft({ step: "export" }, "exported");
      }

      setSaved(true);
    } catch (error) {
      Alert.alert(
        "Export failed",
        error instanceof Error ? error.message : "Could not save your flyer.",
      );
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  }, [
    aspectRatio,
    captureImage,
    draft.audioUri,
    draft.eventName,
    exportFormat,
    mergeDraft,
    persistDraft,
    trimEnd,
    trimStart,
  ]);

  const handleShare = useCallback(async () => {
    try {
      let shareUri: string;
      if (exportFormat === "video" && draft.audioUri) {
        if (!saved) {
          await saveToCameraRoll();
        }
        shareUri = draft.exportedVideoUri ?? "";
        if (!shareUri) {
          throw new Error("Video export is not ready yet.");
        }
      } else {
        if (!saved) {
          await saveToCameraRoll();
        }
        shareUri = await captureImage();
      }
      await Share.share({ url: shareUri });
    } catch (error) {
      Alert.alert(
        "Share failed",
        error instanceof Error ? error.message : "Could not share your flyer.",
      );
    }
  }, [
    captureImage,
    draft.audioUri,
    draft.exportedVideoUri,
    exportFormat,
    saveToCameraRoll,
    saved,
  ]);

  const videoSubtitle = draft.audioUri
    ? `With audio · ${clipSec.toFixed(0)} sec · ${aspectRatio}`
    : `Add audio in the editor · ${aspectRatio}`;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={28} color={colors.dark.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Export</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        <View style={styles.previewWrap}>
          <View
            style={[
              styles.previewFrame,
              { width: preview.width, height: preview.height },
            ]}
          >
            <FlyerTemplateView draft={draft} />
          </View>
        </View>

        {isExporting && exportFormat === "video" ? (
          <Text style={styles.progressHint}>Rendering video… {progress}%</Text>
        ) : null}

        <Text style={styles.sectionLabel}>Format</Text>
        <FormatOption
          icon="videocam-outline"
          title="Video · MP4"
          subtitle={videoSubtitle}
          selected={exportFormat === "video"}
          onPress={() => mergeDraft({ exportFormat: "video" as FlyerExportFormat })}
        />
        <FormatOption
          icon="image-outline"
          title="Image · PNG"
          subtitle={`Static · ${aspectRatio}`}
          selected={exportFormat === "image"}
          onPress={() => mergeDraft({ exportFormat: "image" as FlyerExportFormat })}
        />

        <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>
          Aspect Ratio
        </Text>
        <View style={styles.aspectRow}>
          {(["9:16", "4:5"] as FlyerAspectRatio[]).map((ratio) => {
            const active = aspectRatio === ratio;
            return (
              <Pressable
                key={ratio}
                style={[styles.aspectButton, active && styles.aspectButtonActive]}
                onPress={() => mergeDraft({ aspectRatio: ratio })}
                disabled={isExporting}
              >
                <Text
                  style={[
                    styles.aspectButtonText,
                    active && styles.aspectButtonTextActive,
                  ]}
                >
                  {ratio === "9:16" ? "9:16 Story" : "4:5 Post"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={styles.instagramButton}
          onPress={() => void handleShare()}
          disabled={isExporting}
          accessibilityRole="button"
          accessibilityLabel="Share to Instagram"
        >
          {isExporting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.instagramButtonText}>Share to Instagram</Text>
          )}
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => void saveToCameraRoll()}
          disabled={isExporting}
          accessibilityRole="button"
          accessibilityLabel="Save to camera roll"
        >
          <Text style={styles.secondaryButtonText}>Save to camera roll</Text>
        </Pressable>

        {saved ? (
          <Text style={styles.savedHint}>Saved to your camera roll.</Text>
        ) : null}
      </View>

      <ViewShot
        ref={exportRef}
        style={[
          styles.offscreen,
          { width: exportSize.width, height: exportSize.height },
        ]}
        options={{
          format: "png",
          quality: FLYER_CAPTURE_QUALITY,
          width: exportSize.width,
          height: exportSize.height,
        }}
      >
        <FlyerTemplateView draft={draft} />
      </ViewShot>
    </SafeAreaView>
  );
}

function FormatOption({
  icon,
  title,
  subtitle,
  selected,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.formatCard, selected && styles.formatCardSelected]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <View style={styles.formatIcon}>
        <Ionicons name={icon} size={22} color={colors.dark.text} />
      </View>
      <View style={styles.formatBody}>
        <Text style={styles.formatTitle}>{title}</Text>
        <Text style={styles.formatSubtitle}>{subtitle}</Text>
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? (
          <Ionicons name="checkmark" size={14} color={colors.dark.background} />
        ) : null}
      </View>
    </Pressable>
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
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.dark.text,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  previewWrap: {
    alignItems: "center",
    marginVertical: spacing.md,
  },
  previewFrame: {
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: "#111",
  },
  progressHint: {
    fontSize: 13,
    color: colors.dark.textSecondary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.dark.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  formatCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dark.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dark.border,
    marginBottom: spacing.sm,
  },
  formatCardSelected: {
    borderWidth: 2,
    borderColor: colors.dark.text,
  },
  formatIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.dark.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  formatBody: { flex: 1 },
  formatTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.dark.text,
  },
  formatSubtitle: {
    fontSize: 12,
    color: colors.dark.textSecondary,
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.dark.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    backgroundColor: colors.dark.text,
    borderColor: colors.dark.text,
  },
  aspectRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  aspectButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: "center",
    backgroundColor: colors.dark.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dark.border,
  },
  aspectButtonActive: {
    backgroundColor: colors.dark.text,
  },
  aspectButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.dark.text,
  },
  aspectButtonTextActive: {
    color: colors.dark.background,
  },
  instagramButton: {
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: "center",
    backgroundColor: INSTAGRAM_GRADIENT[1],
    marginBottom: spacing.sm,
  },
  instagramButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  secondaryButton: {
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.dark.border,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.dark.text,
  },
  savedHint: {
    fontSize: 12,
    color: colors.dark.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  offscreen: {
    position: "absolute",
    top: 0,
    left: -10000,
    backgroundColor: "#000",
    overflow: "hidden",
  },
});
