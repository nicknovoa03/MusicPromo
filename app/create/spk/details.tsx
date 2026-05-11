import { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Image,
  Modal,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "convex/react";
import * as ImagePicker from "expo-image-picker";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { colors, typography, spacing, radius } from "@/constants/tokens";
import { encodeUriParam } from "@/lib/uri";
import { normalizeMediaUri } from "@/lib/mediaUri";
import * as FileSystem from "expo-file-system/legacy";
import { getTemplateDefinition, resolveTemplateId } from "@/lib/templates";
import { useLocalSession } from "@/providers/localSession";
import { listLocalProjects, type LocalProject } from "@/lib/localProjects";
import { useFocusEffect } from "@react-navigation/native";

type ConvexProject = Doc<"projects">;
type AnyProject = ConvexProject | LocalProject;

function isLocalProject(p: AnyProject): p is LocalProject {
  return "id" in p;
}

function getProjectId(p: AnyProject): string {
  return isLocalProject(p) ? p.id : String(p._id);
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function SpkDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isLocalGuest } = useLocalSession();

  const convexProjects = useQuery(api.projects.listByUser);
  const [localProjects, setLocalProjects] = useState<LocalProject[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!isLocalGuest) return;
      let active = true;
      listLocalProjects().then((ps) => {
        if (active) setLocalProjects(ps);
      });
      return () => { active = false; };
    }, [isLocalGuest]),
  );

  const [artistName, setArtistName] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [linkedProjectId, setLinkedProjectId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState<string | null>(null);
  const [clipDurationSec, setClipDurationSec] = useState<number | null>(null);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [pickerProjects, setPickerProjects] = useState<AnyProject[]>([]);
  const [isLoadingPicker, setIsLoadingPicker] = useState(false);
  const [isPickingPhoto, setIsPickingPhoto] = useState(false);
  const pickerCheckRef = useRef<Promise<void> | null>(null);

  const canAdvance = Boolean(photoUri && title.trim());

  const pickPhoto = useCallback(async () => {
    if (isPickingPhoto) return;
    setIsPickingPhoto(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 1,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setPhotoUri(asset.uri);
        setPhotoName(asset.fileName ?? null);
        setLinkedProjectId(null);
        setTemplateName(null);
        setClipDurationSec(null);
      }
    } catch {
      Alert.alert("Could not open photo library", "Please try again.");
    } finally {
      setIsPickingPhoto(false);
    }
  }, [isPickingPhoto]);

  const linkProject = useCallback((project: AnyProject) => {
    const pid = getProjectId(project);
    const pPhotoUri = normalizeMediaUri(project.photoUri) ?? null;
    const pTitle = project.title ?? "";
    const pTemplateId = isLocalProject(project) ? project.templateId : project.templateId;
    const pTrimStart = project.trimStart ?? 0;
    const pTrimEnd = project.trimEnd ?? 0;

    setPhotoUri(pPhotoUri);
    setPhotoName(project.photoName ?? null);
    setTitle(pTitle);
    setLinkedProjectId(pid);
    setTemplateName(getTemplateDefinition(resolveTemplateId(pTemplateId)).name);
    setClipDurationSec(pTrimEnd > pTrimStart ? pTrimEnd - pTrimStart : null);
    setShowProjectPicker(false);
  }, []);

  const unlink = useCallback(() => {
    setLinkedProjectId(null);
    setTemplateName(null);
    setClipDurationSec(null);
  }, []);

  const openProjectPicker = useCallback(() => {
    setShowProjectPicker(true);
    setIsLoadingPicker(true);

    const candidates: AnyProject[] = isLocalGuest
      ? (localProjects ?? []).filter((p) => Boolean(p.photoUri))
      : (convexProjects ?? []).filter(
          (p) => (!p.type || p.type === "video") && Boolean(p.photoUri),
        );

    const check = (async () => {
      const flags = await Promise.all(
        candidates.map(async (p) => {
          const uri = normalizeMediaUri(p.photoUri);
          if (!uri || !uri.startsWith("file://")) return true;
          try {
            const info = await FileSystem.getInfoAsync(uri);
            return info.exists;
          } catch {
            return false;
          }
        }),
      );
      setPickerProjects(candidates.filter((_, i) => flags[i]));
      setIsLoadingPicker(false);
    })();

    pickerCheckRef.current = check;
  }, [isLocalGuest, localProjects, convexProjects]);

  const handleNext = useCallback(() => {
    if (!canAdvance) return;
    router.push({
      pathname: "/create/spk/vision" as any,
      params: {
        artistName: artistName.trim(),
        photoUri: encodeUriParam(photoUri ?? ""),
        photoName: photoName ?? "",
        title: title.trim(),
        linkedProjectId: linkedProjectId ?? "",
        templateName: templateName ?? "",
        clipDurationSec: clipDurationSec != null ? String(clipDurationSec) : "",
      },
    });
  }, [canAdvance, router, photoUri, photoName, title, linkedProjectId, templateName, clipDurationSec]);

  const surface = colors.dark.surface;
  const text = colors.dark.text;
  const secondary = colors.dark.textSecondary;
  const border = colors.dark.border;
  const muted = colors.dark.surfaceMuted;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={22} color={text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: text }]}>New Song Press Kit</Text>
        <Text style={[styles.stepLabel, { color: secondary }]}>1 of 3</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Artist name */}
          <Text style={[styles.sectionTitle, { color: text }]}>Artist Name</Text>
          <View style={[styles.inputWrapper, { backgroundColor: surface, borderColor: border }, { marginBottom: spacing.lg }]}>
            <TextInput
              style={[styles.textInput, { color: text }]}
              placeholder="Your artist name"
              placeholderTextColor={secondary}
              value={artistName}
              onChangeText={setArtistName}
              returnKeyType="done"
              maxLength={80}
            />
          </View>

          <Text style={[styles.sectionTitle, { color: text }]}>Track Artwork</Text>

          {/* Photo picker */}
          <Pressable
            style={({ pressed }) => [
              styles.photoPicker,
              { backgroundColor: surface, borderColor: border },
              !photoUri && styles.photoPickerEmpty,
              pressed && styles.pressed,
            ]}
            onPress={pickPhoto}
            accessibilityLabel={photoUri ? "Change artwork" : "Add artwork"}
            accessibilityRole="button"
          >
            {photoUri ? (
              <>
                <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
                <View style={styles.changeOverlay}>
                  <View style={styles.changeChip}>
                    <Ionicons name="camera-outline" size={14} color="#FFFFFF" />
                    <Text style={styles.changeChipText}>Change</Text>
                  </View>
                </View>
              </>
            ) : isPickingPhoto ? (
              <ActivityIndicator size="large" color={secondary} />
            ) : (
              <View style={styles.emptyPhoto}>
                <Ionicons name="image-outline" size={40} color={secondary} />
                <Text style={[styles.emptyPhotoText, { color: secondary }]}>Tap to add artwork</Text>
              </View>
            )}
          </Pressable>

          {/* Link to existing project */}
          {!linkedProjectId ? (
            <Pressable
              style={({ pressed }) => [
                styles.linkButton,
                { backgroundColor: muted, borderColor: border },
                pressed && styles.pressed,
              ]}
              onPress={openProjectPicker}
              accessibilityRole="button"
              accessibilityLabel="Link to existing Music Promo project"
            >
              <Ionicons name="link-outline" size={16} color={secondary} />
              <Text style={[styles.linkButtonText, { color: secondary }]}>
                Link to existing Music Promo
              </Text>
            </Pressable>
          ) : (
            <View style={[styles.linkedBadge, { backgroundColor: muted, borderColor: border }]}>
              <Ionicons name="checkmark-circle" size={16} color={colors.dark.text} />
              <Text style={[styles.linkedText, { color: text }]} numberOfLines={1}>
                Linked
              </Text>
              <Pressable onPress={unlink} style={styles.unlinkButton} accessibilityLabel="Remove link">
                <Ionicons name="close-circle" size={16} color={secondary} />
              </Pressable>
            </View>
          )}

          {/* Track title */}
          <Text style={[styles.sectionTitle, { color: text, marginTop: spacing.lg }]}>
            Track Title
          </Text>
          <View style={[styles.inputWrapper, { backgroundColor: surface, borderColor: border }]}>
            <TextInput
              style={[styles.textInput, { color: text }]}
              placeholder="e.g. Midnight Drive"
              placeholderTextColor={secondary}
              value={title}
              onChangeText={setTitle}
              returnKeyType="done"
              maxLength={80}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Next button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <Pressable
          style={({ pressed }) => [
            styles.nextButton,
            !canAdvance && styles.nextButtonDisabled,
            pressed && canAdvance && styles.pressed,
          ]}
          onPress={handleNext}
          disabled={!canAdvance}
          accessibilityRole="button"
          accessibilityLabel="Next step"
          accessibilityState={{ disabled: !canAdvance }}
        >
          <Text style={[styles.nextButtonText, !canAdvance && styles.nextButtonTextDisabled]}>
            Next
          </Text>
          <Ionicons
            name="arrow-forward"
            size={18}
            color={canAdvance ? colors.accent.onPrimary : secondary}
          />
        </Pressable>
      </View>

      {/* Project picker modal */}
      <Modal
        visible={showProjectPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProjectPicker(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.dark.background }]} edges={["top"]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: text }]}>Link a Music Promo</Text>
            <Pressable
              onPress={() => setShowProjectPicker(false)}
              style={[styles.modalClose, { backgroundColor: surface }]}
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={18} color={text} />
            </Pressable>
          </View>

          {isLoadingPicker ? (
            <View style={styles.modalEmpty}>
              <ActivityIndicator size="large" color={secondary} />
            </View>
          ) : pickerProjects.length === 0 ? (
            <View style={styles.modalEmpty}>
              <Text style={[styles.modalEmptyText, { color: secondary }]}>
                {isLocalGuest
                  ? "Sign in to link an existing Music Promo."
                  : "No Music Promo projects yet. Create one first, then link it here."}
              </Text>
            </View>
          ) : (
            <FlatList
              data={pickerProjects}
              keyExtractor={getProjectId}
              contentContainerStyle={styles.modalList}
              renderItem={({ item }) => {
                const pPhotoUri = normalizeMediaUri(item.photoUri);
                const pTitle = item.title?.trim() ? item.title : "Untitled";
                return (
                  <Pressable
                    style={({ pressed }) => [
                      styles.projectRow,
                      { backgroundColor: surface, borderColor: border },
                      pressed && styles.pressed,
                    ]}
                    onPress={() => linkProject(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Link ${pTitle}`}
                  >
                    <View style={[styles.projectThumb, { backgroundColor: muted }]}>
                      {pPhotoUri ? (
                        <Image source={{ uri: pPhotoUri }} style={styles.projectThumbImage} resizeMode="cover" />
                      ) : (
                        <Ionicons name="image-outline" size={20} color={secondary} />
                      )}
                    </View>
                    <View style={styles.projectInfo}>
                      <Text style={[styles.projectTitle, { color: text }]} numberOfLines={1}>
                        {pTitle}
                      </Text>
                      <Text style={[styles.projectDate, { color: secondary }]}>
                        {formatDate(item.createdAt)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={secondary} />
                  </Pressable>
                );
              }}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  flex: {
    flex: 1,
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
  stepLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.5)",
  },
  photoPicker: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm,
  },
  photoPickerEmpty: {
    borderStyle: "dashed",
    borderWidth: 1.5,
  },
  photoPreview: {
    width: "100%",
    height: "100%",
  },
  changeOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  changeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  changeChipText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  emptyPhoto: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyPhotoText: {
    fontSize: 14,
    fontWeight: "500",
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm,
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  linkedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm,
  },
  linkedText: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  unlinkButton: {
    padding: 2,
  },
  inputWrapper: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === "ios" ? spacing.md : spacing.sm,
  },
  textInput: {
    ...typography.body,
    padding: 0,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.dark.border,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.accent.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  nextButtonDisabled: {
    opacity: 0.3,
  },
  nextButtonText: {
    ...typography.button,
    color: colors.accent.onPrimary,
  },
  nextButtonTextDisabled: {
    color: colors.dark.textSecondary,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.985 }],
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  modalTitle: {
    ...typography.h2,
    flex: 1,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  modalEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  modalEmptyText: {
    ...typography.body,
    textAlign: "center",
    lineHeight: 22,
  },
  modalList: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  projectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  projectThumb: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  projectThumbImage: {
    width: "100%",
    height: "100%",
  },
  projectInfo: {
    flex: 1,
    gap: 2,
  },
  projectTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  projectDate: {
    fontSize: 12,
  },
});
