import { useState, useCallback, useRef, useEffect } from "react";
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
import type { Id } from "../../../convex/_generated/dataModel";
import * as ImagePicker from "expo-image-picker";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { colors, typography, spacing, radius } from "@/constants/tokens";
import { normalizeMediaUri } from "@/lib/mediaUri";
import * as FileSystem from "expo-file-system/legacy";
import { getTemplateDefinition, resolveTemplateId } from "@/lib/templates";
import { useLocalSession } from "@/providers/localSession";
import { listLocalProjects, type LocalProject } from "@/lib/localProjects";
import { getLocalArtistProfile, type LocalArtistProfile } from "@/lib/localProfile";
import { useFocusEffect } from "@react-navigation/native";
import { SpkFlowHeader } from "@/components/spk/SpkFlowHeader";
import { useSpkClose } from "@/hooks/useSpkClose";
import { useSpkWizardBack } from "@/hooks/useSpkWizardBack";
import { useSpkScreenParams } from "@/hooks/useSpkScreenParams";
import { getLocalProject } from "@/lib/localProjects";
import { useSpkDraft } from "@/providers/SpkDraftContext";
import {
  convexProjectToSpkDraft,
  localProjectToSpkDraft,
  type SpkProjectRecord,
  type SpkLocalProjectRecord,
} from "@/lib/spkDraft";

function firstParam(p: string | string[] | undefined): string {
  return Array.isArray(p) ? (p[0] ?? "") : (p ?? "");
}

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
  useSpkScreenParams("details");
  const {
    draft,
    mergeDraft,
    projectId,
    localProjectId,
    setProjectId,
    setLocalProjectId,
    isExistingProject,
    getNavigationParams,
  } = useSpkDraft();
  const hydratedDraftRef = useRef(false);

  const convexProjects = useQuery(api.projects.listByUser);
  const savedProject = useQuery(
    api.projects.getById,
    !isLocalGuest && projectId
      ? { projectId: projectId as Id<"projects"> }
      : "skip",
  );
  const convexUser = useQuery(api.users.current);
  const [localProjects, setLocalProjects] = useState<LocalProject[] | null>(null);
  const [localProfile, setLocalProfile] = useState<LocalArtistProfile | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!isLocalGuest) return;
      let active = true;
      listLocalProjects().then((ps) => {
        if (active) setLocalProjects(ps);
      });
      getLocalArtistProfile().then((profile) => {
        if (active) setLocalProfile(profile);
      });
      return () => { active = false; };
    }, [isLocalGuest]),
  );

  const profileArtistName = isLocalGuest
    ? (localProfile?.artistName ?? "")
    : (convexUser?.artistName ?? convexUser?.name ?? "");

  const hasUserEditedArtistName = useRef(Boolean(draft.artistName?.trim()));

  const artistName = draft.artistName ?? "";
  const photoUri = draft.photoUri ?? null;
  const photoName = draft.photoName ?? null;
  const title = draft.title ?? "";
  const linkedProjectId = draft.linkedProjectId ?? null;
  const templateName = draft.templateName ?? null;
  const clipDurationSec = draft.clipDurationSec ?? null;

  useEffect(() => {
    if (hasUserEditedArtistName.current || !profileArtistName) return;
    if (!artistName.trim()) {
      mergeDraft({ artistName: profileArtistName });
    }
  }, [profileArtistName, artistName, mergeDraft]);

  useEffect(() => {
    if (hydratedDraftRef.current) return;

    const hydrateFromLocal = async () => {
      if (!localProjectId) return;
      const project = await getLocalProject(localProjectId);
      if (!project || project.type !== "spk") return;
      hydratedDraftRef.current = true;
      if (project.artistName) hasUserEditedArtistName.current = true;
      mergeDraft({
        ...localProjectToSpkDraft(project as SpkLocalProjectRecord),
        step: "details",
      });
    };

    if (isLocalGuest && localProjectId) {
      void hydrateFromLocal();
      return;
    }

    if (!isLocalGuest && savedProject && savedProject.type === "spk") {
      hydratedDraftRef.current = true;
      if (savedProject.artistName) hasUserEditedArtistName.current = true;
      mergeDraft({
        ...convexProjectToSpkDraft(savedProject as SpkProjectRecord),
        step: "details",
      });
    }
  }, [isLocalGuest, localProjectId, savedProject, mergeDraft]);

  const { goBackOneStep, canStepBack } = useSpkWizardBack("details");
  const { handleClose, isSaving } = useSpkClose({
    step: "details",
    persistStatus: isExistingProject ? "exported" : "draft",
  });
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
        mergeDraft({
          photoUri: asset.uri,
          photoName: asset.fileName ?? null,
          linkedProjectId: null,
          templateName: null,
          clipDurationSec: null,
        });
      }
    } catch {
      Alert.alert("Could not open photo library", "Please try again.");
    } finally {
      setIsPickingPhoto(false);
    }
  }, [isPickingPhoto, mergeDraft]);

  const linkProject = useCallback((project: AnyProject) => {
    const pid = getProjectId(project);
    const pPhotoUri = normalizeMediaUri(project.photoUri) ?? null;
    const pTitle = project.title ?? "";
    const pTemplateId = isLocalProject(project) ? project.templateId : project.templateId;
    const pTrimStart = project.trimStart ?? 0;
    const pTrimEnd = project.trimEnd ?? 0;

    mergeDraft({
      photoUri: pPhotoUri,
      photoName: project.photoName ?? null,
      title: pTitle,
      linkedProjectId: pid,
      templateName: getTemplateDefinition(resolveTemplateId(pTemplateId)).name,
      clipDurationSec: pTrimEnd > pTrimStart ? pTrimEnd - pTrimStart : null,
    });
    setShowProjectPicker(false);
  }, [mergeDraft]);

  const unlink = useCallback(() => {
    mergeDraft({
      linkedProjectId: null,
      templateName: null,
      clipDurationSec: null,
    });
  }, [mergeDraft]);

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
    mergeDraft({
      step: "vision",
      artistName: artistName.trim(),
      title: title.trim(),
    });
    router.push({
      pathname: "/create/spk/vision" as any,
      params: getNavigationParams("vision"),
    });
  }, [
    canAdvance,
    router,
    artistName,
    title,
    mergeDraft,
    getNavigationParams,
  ]);

  const surface = colors.dark.surface;
  const text = colors.dark.text;
  const secondary = colors.dark.textSecondary;
  const border = colors.dark.border;
  const muted = colors.dark.surfaceMuted;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <SpkFlowHeader
        title="New Song Press Kit"
        stepLabel="1 of 4"
        showBackButton={canStepBack}
        onBack={goBackOneStep}
        onExit={handleClose}
        isSaving={isSaving}
      />

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
              onChangeText={(text) => {
                hasUserEditedArtistName.current = true;
                mergeDraft({ artistName: text });
              }}
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
              onChangeText={(text) => mergeDraft({ title: text })}
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
