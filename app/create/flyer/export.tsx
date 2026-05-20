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
  useWindowDimensions,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as MediaLibrary from "expo-media-library";
import ViewShot, { type ViewShotRef } from "react-native-view-shot";
import { colors, spacing, radius } from "@/constants/tokens";
import { FlyerPreviewFrame } from "@/components/flyer/FlyerPreviewFrame";
import { FlyerTemplateView } from "@/components/flyer/FlyerTemplateView";
import { FlyerFlowHeader } from "@/components/flyer/FlyerFlowHeader";
import { useFlyerDraft } from "@/providers/FlyerDraftContext";
import { useFlyerScreenParams } from "@/hooks/useFlyerScreenParams";
import { useFlyerClose } from "@/hooks/useFlyerClose";
import { useFlyerWizardBack } from "@/hooks/useFlyerWizardBack";
import {
  flyerExportSize,
  FLYER_CAPTURE_QUALITY,
  FLYER_PREVIEW_MAX_WIDTH_EXPORT,
  flyerPreviewMaxHeight,
} from "@/lib/flyerDimensions";
import type { FlyerAspectRatio, FlyerExportFormat } from "@/lib/flyerDraft";
import { getFlyerStepLabel } from "@/lib/flyerDraft";
import { renderFlyerVideo } from "@/lib/renderFlyerVideo";
import {
  downloadImageUri,
  isWebImageExportAvailable,
  shareOrDownloadImageUri,
  slugifyExportFileName,
  captureWebViewShot,
} from "@/lib/webImageDownload";

const INSTAGRAM_GRADIENT = ["#F58529", "#DD2A7B", "#8134AF"] as const;

export default function FlyerExportScreen() {
  useFlyerScreenParams("export");
  const { draft, mergeDraft, isExistingProject } = useFlyerDraft();
  const { height: windowHeight } = useWindowDimensions();
  const exportRef = useRef<ViewShotRef>(null);
  const webCaptureRef = useRef<ViewShotRef>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [progress, setProgress] = useState(0);
  const { handleClose, persistDraft, isSaving } = useFlyerClose({
    step: "export",
    skipPersist: saved,
    persistStatus: isExistingProject || saved ? "exported" : "draft",
  });
  const { goBackOneStep, canStepBack } = useFlyerWizardBack("export");

  const aspectRatio = draft.aspectRatio ?? "9:16";
  const exportFormat = draft.exportFormat ?? "image";
  const isWeb = isWebImageExportAvailable();
  const exportSize = flyerExportSize(aspectRatio);
  const previewMaxHeight =
    aspectRatio === "9:16"
      ? Math.round(windowHeight * 0.48)
      : flyerPreviewMaxHeight(windowHeight);
  const previewMaxWidth =
    aspectRatio === "9:16"
      ? Math.round(FLYER_PREVIEW_MAX_WIDTH_EXPORT * 1.2)
      : FLYER_PREVIEW_MAX_WIDTH_EXPORT;
  const trimStart = draft.trimStart ?? 0;
  const trimEnd = draft.trimEnd ?? trimStart + 10;
  const clipSec = Math.max(1, trimEnd - trimStart);
  const exportFileName = `${slugifyExportFileName(draft.eventName ?? "event-flyer")}-${aspectRatio.replace(":", "x")}`;

  const captureImage = useCallback(async () => {
    if (isWeb) {
      return captureWebViewShot(webCaptureRef.current);
    }

    const ref = exportRef.current;
    if (!ref?.capture) {
      throw new Error("Export view not ready");
    }
    return ref.capture();
  }, [isWeb]);

  const saveFlyerImage = useCallback(
    async (uri: string) => {
      if (isWeb) {
        downloadImageUri(uri, exportFileName);
        return;
      }

      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission needed",
          "Allow photo library access to save your flyer.",
        );
        const denied = new Error("Photo library permission denied");
        denied.name = "PermissionDenied";
        throw denied;
      }

      await MediaLibrary.saveToLibraryAsync(uri);
    },
    [exportFileName, isWeb],
  );

  const saveToCameraRoll = useCallback(async () => {
    setIsExporting(true);
    setProgress(0);
    try {
      if (exportFormat === "video") {
        if (Platform.OS === "web") {
          Alert.alert(
            "Video export unavailable",
            "Video export requires a native build. On web, switch to image export or test on your phone.",
          );
          return;
        }
        const permission = await MediaLibrary.requestPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            "Permission needed",
            "Allow photo library access to save your flyer.",
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
        await saveFlyerImage(uri);
        await persistDraft({ step: "export" }, "exported");
      }

      setSaved(true);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      if (error instanceof Error && error.name === "PermissionDenied") {
        return;
      }
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
    saveFlyerImage,
    trimEnd,
    trimStart,
  ]);

  const handleShare = useCallback(async () => {
    try {
      if (exportFormat === "video" && draft.audioUri) {
        if (Platform.OS === "web") {
          Alert.alert(
            "Video export unavailable",
            "Video export requires a native build. On web, switch to image export or test on your phone.",
          );
          return;
        }
        if (!saved) {
          await saveToCameraRoll();
        }
        const shareUri = draft.exportedVideoUri ?? "";
        if (!shareUri) {
          throw new Error("Video export is not ready yet.");
        }
        await Share.share({ url: shareUri });
        return;
      }

      const uri = await captureImage();
      if (isWeb) {
        await shareOrDownloadImageUri(uri, exportFileName);
        if (!saved) {
          await persistDraft({ step: "export" }, "exported");
          setSaved(true);
        }
        return;
      }

      if (!saved) {
        await saveToCameraRoll();
      }
      await Share.share({ url: uri });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      Alert.alert(
        "Share failed",
        error instanceof Error ? error.message : "Could not share your flyer.",
      );
    }
  }, [
    captureImage,
    draft.audioUri,
    draft.exportedVideoUri,
    exportFileName,
    exportFormat,
    isWeb,
    persistDraft,
    saveToCameraRoll,
    saved,
  ]);

  const videoSubtitle = draft.audioUri
    ? `With audio · ${clipSec.toFixed(0)} sec · ${aspectRatio}`
    : `Add audio in the editor · ${aspectRatio}`;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <FlyerFlowHeader
        title={draft.eventName?.trim() || "Export"}
        stepLabel={getFlyerStepLabel("export")}
        showBackButton={canStepBack}
        onBack={goBackOneStep}
        onExit={handleClose}
        isSaving={isSaving || isExporting}
      />

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.previewWrap}>
          <FlyerPreviewFrame
            draft={draft}
            aspectRatio={aspectRatio}
            maxWidth={previewMaxWidth}
            maxHeight={previewMaxHeight}
            borderRadius={radius.md}
          />
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
          accessibilityLabel={isWeb ? "Download PNG" : "Save to camera roll"}
        >
          <Text style={styles.secondaryButtonText}>
            {isWeb ? "Download PNG" : "Save to camera roll"}
          </Text>
        </Pressable>

        {saved ? (
          <Text style={styles.savedHint}>
            {isWeb ? "Downloaded to your device." : "Saved to your camera roll."}
          </Text>
        ) : null}
      </ScrollView>

      {isWeb ? (
        <View
          pointerEvents="none"
          style={[
            styles.webCaptureLayer,
            { width: exportSize.width, height: exportSize.height },
          ]}
        >
          <ViewShot
            ref={webCaptureRef}
            style={{ width: exportSize.width, height: exportSize.height }}
            options={{
              format: "png",
              quality: FLYER_CAPTURE_QUALITY,
              width: exportSize.width,
              height: exportSize.height,
              result: "data-uri",
            }}
          >
            <FlyerTemplateView draft={draft} />
          </ViewShot>
        </View>
      ) : null}

      {!isWeb ? (
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
      ) : null}
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
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  previewWrap: {
    alignItems: "center",
    marginVertical: spacing.sm,
    flexShrink: 1,
  },
  webCaptureLayer: {
    position: "absolute",
    top: 0,
    left: -10000,
    opacity: 1,
    overflow: "hidden",
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
