import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { usePostHog } from "posthog-react-native";
import { colors, typography, spacing, radius } from "@/constants/tokens";
import type { EventName } from "@/lib/analytics";

type Tab = "photo" | "audio";

interface MediaSelection {
  photoUri: string | null;
  photoName: string | null;
  audioUri: string | null;
  audioName: string | null;
}

export default function PickerScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  const [activeTab, setActiveTab] = useState<Tab>("photo");
  const [media, setMedia] = useState<MediaSelection>({
    photoUri: null,
    photoName: null,
    audioUri: null,
    audioName: null,
  });
  const [loading, setLoading] = useState(false);

  const track = useCallback(
    (event: EventName, props?: Record<string, string>) => {
      posthog?.capture(event, props);
    },
    [posthog],
  );

  const pickPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "MusicPromo needs access to your photos to create promo videos.",
      );
      return;
    }

    setLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const name =
          asset.fileName ?? asset.uri.split("/").pop() ?? "Photo";
        setMedia((prev) => ({
          ...prev,
          photoUri: asset.uri,
          photoName: name,
        }));
        track("photo_selected", { source: "camera_roll" });
      }
    } finally {
      setLoading(false);
    }
  }, [track]);

  const pickAudio = useCallback(async () => {
    setLoading(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["audio/mpeg", "audio/wav", "audio/x-m4a", "audio/mp4"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setMedia((prev) => ({
          ...prev,
          audioUri: asset.uri,
          audioName: asset.name,
        }));
        track("audio_selected", { format: asset.mimeType ?? "unknown" });
      }
    } finally {
      setLoading(false);
    }
  }, [track]);

  const handleAdd = useCallback(() => {
    if (activeTab === "photo") {
      if (media.photoUri && !media.audioUri) {
        setActiveTab("audio");
        return;
      }
    } else {
      if (media.audioUri && !media.photoUri) {
        setActiveTab("photo");
        return;
      }
    }

    if (media.photoUri && media.audioUri) {
      router.push({
        pathname: "/create/editor" as const,
        params: {
          photoUri: media.photoUri,
          photoName: media.photoName ?? "Photo",
          audioUri: media.audioUri,
          audioName: media.audioName ?? "Audio",
        },
      });
    }
  }, [activeTab, media, router]);

  const canAdd = activeTab === "photo" ? !!media.photoUri : !!media.audioUri;
  const bothSelected = !!media.photoUri && !!media.audioUri;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)" as const);
            }
          }}
          style={styles.headerAction}
          accessibilityLabel="Cancel"
          accessibilityRole="button"
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>

        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, activeTab === "photo" && styles.tabActive]}
            onPress={() => setActiveTab("photo")}
            accessibilityLabel="Photos tab"
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "photo" }}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "photo" && styles.tabTextActive,
              ]}
            >
              Photos
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === "audio" && styles.tabActive]}
            onPress={() => setActiveTab("audio")}
            accessibilityLabel="Audio tab"
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "audio" }}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "audio" && styles.tabTextActive,
              ]}
            >
              Audio
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={handleAdd}
          style={[styles.headerAction, styles.headerActionRight]}
          disabled={!canAdd}
          accessibilityLabel={bothSelected ? "Continue to editor" : "Add media"}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canAdd }}
        >
          <Text style={[styles.addText, !canAdd && styles.addTextDisabled]}>
            {bothSelected ? "Next" : "Add"}
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      {activeTab === "photo" ? (
        <View style={styles.content}>
          {media.photoUri ? (
            <View style={styles.selectedMedia}>
              <Image
                source={{ uri: media.photoUri }}
                style={styles.photoPreview}
                accessibilityLabel="Selected photo"
              />
              <View style={styles.selectedInfo}>
                <View style={styles.selectedRow}>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.accent.success}
                  />
                  <Text style={styles.selectedName} numberOfLines={1}>
                    {media.photoName}
                  </Text>
                </View>
                <Pressable
                  onPress={pickPhoto}
                  style={styles.changeButton}
                  accessibilityLabel="Change photo"
                  accessibilityRole="button"
                >
                  <Text style={styles.changeText}>Change</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.pickArea,
                pressed && styles.pickAreaPressed,
              ]}
              onPress={pickPhoto}
              disabled={loading}
              accessibilityLabel="Select a photo from camera roll"
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color={colors.accent.primary} size="large" />
              ) : (
                <>
                  <View style={styles.pickIcon}>
                    <Ionicons
                      name="image-outline"
                      size={40}
                      color={colors.accent.primary}
                    />
                  </View>
                  <Text style={styles.pickTitle}>Select Photo</Text>
                  <Text style={styles.pickHint}>
                    Choose an image from your camera roll
                  </Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      ) : (
        <View style={styles.content}>
          {media.audioUri ? (
            <View style={styles.selectedMedia}>
              <View style={styles.audioThumb}>
                <Ionicons
                  name="musical-note"
                  size={32}
                  color={colors.accent.primary}
                />
              </View>
              <View style={styles.selectedInfo}>
                <View style={styles.selectedRow}>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.accent.success}
                  />
                  <Text style={styles.selectedName} numberOfLines={1}>
                    {media.audioName}
                  </Text>
                </View>
                <Pressable
                  onPress={pickAudio}
                  style={styles.changeButton}
                  accessibilityLabel="Change audio"
                  accessibilityRole="button"
                >
                  <Text style={styles.changeText}>Change</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.pickArea,
                pressed && styles.pickAreaPressed,
              ]}
              onPress={pickAudio}
              disabled={loading}
              accessibilityLabel="Select an audio file"
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color={colors.accent.primary} size="large" />
              ) : (
                <>
                  <View style={styles.pickIcon}>
                    <Ionicons
                      name="musical-note-outline"
                      size={40}
                      color={colors.accent.primary}
                    />
                  </View>
                  <Text style={styles.pickTitle}>Select Audio</Text>
                  <Text style={styles.pickHint}>MP3, WAV, or M4A files</Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      )}

      {/* Bottom status bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusItem}>
          <Ionicons
            name={media.photoUri ? "checkmark-circle" : "ellipse-outline"}
            size={16}
            color={
              media.photoUri
                ? colors.accent.success
                : colors.light.textSecondary
            }
          />
          <Text
            style={[
              styles.statusText,
              media.photoUri && styles.statusTextDone,
            ]}
          >
            Photo
          </Text>
        </View>
        <View style={styles.statusDivider} />
        <View style={styles.statusItem}>
          <Ionicons
            name={media.audioUri ? "checkmark-circle" : "ellipse-outline"}
            size={16}
            color={
              media.audioUri
                ? colors.accent.success
                : colors.light.textSecondary
            }
          />
          <Text
            style={[
              styles.statusText,
              media.audioUri && styles.statusTextDone,
            ]}
          >
            Audio
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.light.border,
  },
  headerAction: {
    width: 64,
    height: 44,
    justifyContent: "center",
  },
  headerActionRight: {
    alignItems: "flex-end",
  },
  cancelText: {
    ...typography.body,
    color: colors.light.text,
  },
  addText: {
    ...typography.button,
    color: colors.accent.primary,
  },
  addTextDisabled: {
    opacity: 0.35,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.light.surface,
    borderRadius: radius.full,
    padding: 2,
  },
  tab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  tabActive: {
    backgroundColor: colors.light.background,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.light.textSecondary,
  },
  tabTextActive: {
    color: colors.light.text,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  pickArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.light.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.light.border,
    borderStyle: "dashed",
  },
  pickAreaPressed: {
    opacity: 0.7,
    backgroundColor: colors.light.border,
  },
  pickIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.light.background,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  pickTitle: {
    ...typography.button,
    color: colors.light.text,
    marginBottom: spacing.xs,
  },
  pickHint: {
    ...typography.caption,
    color: colors.light.textSecondary,
  },
  selectedMedia: {
    backgroundColor: colors.light.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  photoPreview: {
    width: "100%",
    aspectRatio: 1,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  audioThumb: {
    width: "100%",
    height: 160,
    backgroundColor: colors.light.border,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  selectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  selectedName: {
    ...typography.body,
    color: colors.light.text,
    flex: 1,
  },
  changeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.light.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.light.border,
  },
  changeText: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.accent.primary,
  },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.light.border,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  statusText: {
    ...typography.caption,
    color: colors.light.textSecondary,
  },
  statusTextDone: {
    color: colors.accent.success,
    fontWeight: "600",
  },
  statusDivider: {
    width: 24,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.light.border,
  },
});
