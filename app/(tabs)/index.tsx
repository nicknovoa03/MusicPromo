import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Pressable,
  FlatList,
  ActivityIndicator,
  Image,
  RefreshControl,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { useConvex, useMutation, useQuery } from "convex/react";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { usePostHog } from "posthog-react-native";
import * as ExpoSwiftUI from "@expo/ui/swift-ui";
import {
  accessibilityLabel as swiftUIAccessibilityLabel,
  onTapGesture as swiftUIOnTapGesture,
  opacity as swiftUIOpacity,
} from "@expo/ui/swift-ui/modifiers";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { colors, typography, spacing, radius } from "@/constants/tokens";
import type { EventName } from "@/lib/analytics";
import {
  canUseIOSNativeUIPhase5,
  getIOSNativeUIPhase5Availability,
  type ExpoSwiftUIModule,
} from "@/lib/iosNativeUi";
import { normalizeMediaUri } from "@/lib/mediaUri";
import { getLocalArtistProfile } from "@/lib/localProfile";
import { encodeUriParam } from "@/lib/uri";
import { useLocalSession } from "@/providers/localSession";
import {
  listLocalProjects,
  removeLocalProject,
  type LocalProject,
} from "@/lib/localProjects";
import {
  getTemplateDefinition,
  parseTemplateTweaksParam,
  resolveTemplateId,
} from "@/lib/templates";

type Project = Doc<"projects"> | LocalProject;
type ProjectAction = "rename" | "duplicate" | "delete";
type ProjectThumbnailProps = {
  project: Project;
  title: string;
};

type NativeProjectContextMenuItemsProps = {
  expoSwiftUI: ExpoSwiftUIModule;
  isDeleting: boolean;
  onAction: (action: ProjectAction) => void;
};

function NativeProjectContextMenuItems({
  expoSwiftUI,
  isDeleting,
  onAction,
}: NativeProjectContextMenuItemsProps) {
  return (
    <expoSwiftUI.ContextMenu.Items>
      <expoSwiftUI.Button
        systemImage="pencil"
        onPress={() => onAction("rename")}
      >
        Rename
      </expoSwiftUI.Button>
      <expoSwiftUI.Button
        systemImage="square.on.square"
        onPress={() => onAction("duplicate")}
      >
        Duplicate
      </expoSwiftUI.Button>
      <expoSwiftUI.Button
        systemImage="trash"
        role="destructive"
        disabled={isDeleting}
        onPress={() => onAction("delete")}
      >
        Delete
      </expoSwiftUI.Button>
    </expoSwiftUI.ContextMenu.Items>
  );
}

function isLocalProject(project: Project): project is LocalProject {
  return "id" in project;
}

function getProjectId(project: Project): string {
  return isLocalProject(project) ? project.id : String(project._id);
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function normalizeAvatarUri(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function ProjectThumbnail({ project, title }: ProjectThumbnailProps) {
  const [thumbnailSize, setThumbnailSize] = useState(0);
  const photoUri = normalizeMediaUri(project.photoUri);
  const fallbackPreviewUri = normalizeMediaUri(project.exportedVideoUri);
  const templateId = resolveTemplateId(project.templateId);
  const templateTweaks = useMemo(
    () => parseTemplateTweaksParam(project.templateTweaks),
    [project.templateTweaks],
  );
  const templateDefinition = useMemo(
    () => getTemplateDefinition(templateId),
    [templateId],
  );
  const TemplateStageComponent = templateDefinition.StageComponent;
  const canRenderTemplateThumbnail = thumbnailSize > 0;

  return (
    <View
      style={styles.thumbnail}
      onLayout={(event) => {
        const nextSize = Math.round(event.nativeEvent.layout.width);
        setThumbnailSize((current) => (current === nextSize ? current : nextSize));
      }}
    >
      {canRenderTemplateThumbnail ? (
        <TemplateStageComponent
          width={thumbnailSize}
          height={thumbnailSize}
          aspectRatio={project.aspectRatio}
          photoUri={photoUri}
          isPlaying={false}
          playbackLabel="Project thumbnail"
          trackTitle={title}
          subtitle={templateDefinition.name}
          templateTweaks={templateTweaks ?? undefined}
        />
      ) : fallbackPreviewUri ? (
        <Image
          source={{ uri: fallbackPreviewUri }}
          style={styles.thumbnailImage}
          resizeMode="cover"
        />
      ) : (
        <Ionicons
          name="image-outline"
          size={30}
          color={colors.light.textSecondary}
        />
      )}
    </View>
  );
}

let hasWarnedHapticsUnavailable = false;

async function triggerSelectionHaptic(type: "enter" | "toggle-on" | "toggle-off") {
  const hapticsCompat = Haptics as unknown as {
    performAndroidHapticsAsync?: (
      hapticType: Haptics.AndroidHaptics,
    ) => Promise<void>;
    impactAsync?: (
      style?: Haptics.ImpactFeedbackStyle,
    ) => Promise<void>;
    selectionAsync?: () => Promise<void>;
  };

  const warnUnavailable = () => {
    if (hasWarnedHapticsUnavailable) return;
    hasWarnedHapticsUnavailable = true;
    console.warn(
      "Selection haptic unavailable in this dev client. Rebuild dev client to relink expo-haptics.",
    );
  };

  const tryImpact = async (style: Haptics.ImpactFeedbackStyle) => {
    if (typeof hapticsCompat.impactAsync !== "function") return false;
    try {
      await hapticsCompat.impactAsync(style);
      return true;
    } catch {
      return false;
    }
  };

  const trySelection = async () => {
    if (typeof hapticsCompat.selectionAsync !== "function") return false;
    try {
      await hapticsCompat.selectionAsync();
      return true;
    } catch {
      return false;
    }
  };

  if (
    Platform.OS === "android" &&
    typeof hapticsCompat.performAndroidHapticsAsync === "function"
  ) {
    try {
      const androidType =
        type === "enter"
          ? Haptics.AndroidHaptics.Context_Click
          : Haptics.AndroidHaptics.Segment_Tick;
      await hapticsCompat.performAndroidHapticsAsync(androidType);
      return;
    } catch (error) {
      console.warn("Selection haptic failed:", error);
      warnUnavailable();
      return;
    }
  }

  if (Platform.OS === "ios") {
    const selectionWorked = await trySelection();
    if (selectionWorked) return;
    warnUnavailable();
    return;
  }

  const impactStyle =
    type === "enter"
      ? Haptics.ImpactFeedbackStyle.Heavy
      : type === "toggle-on"
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light;
  const impactWorked = await tryImpact(impactStyle);
  if (impactWorked) return;

  const selectionWorked = await trySelection();
  if (selectionWorked) return;

  warnUnavailable();
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const convex = useConvex();
  const posthog = usePostHog();
  const { isLocalGuest } = useLocalSession();
  const convexUser = useQuery(api.users.current);
  const projectsQuery = useQuery(api.projects.listByUser);
  const deleteProject = useMutation(api.projects.remove);
  const [localProjects, setLocalProjects] = useState<LocalProject[] | null>(null);
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [actionProject, setActionProject] = useState<Project | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const track = useCallback(
    (event: EventName, props?: Record<string, string>) => {
      posthog?.capture(event, props);
    },
    [posthog],
  );
  const nativeProjectActionsAvailability = getIOSNativeUIPhase5Availability({
    minIOSVersion: 14,
  });
  const nativeProjectActionsEnabledByContract = nativeProjectActionsAvailability.enabled;
  const nativeEmptyStateEnabledByContract = canUseIOSNativeUIPhase5({
    minIOSVersion: 17,
  });
  const shouldLoadExpoSwiftUI =
    nativeProjectActionsEnabledByContract || nativeEmptyStateEnabledByContract;
  const expoSwiftUI = shouldLoadExpoSwiftUI
    ? (ExpoSwiftUI as ExpoSwiftUIModule)
    : null;
  const expoSwiftUIAny = expoSwiftUI as Record<string, unknown> | null;
  const contextMenuAny = expoSwiftUIAny?.ContextMenu as Record<string, unknown> | undefined;
  const hasNativeContextMenuComponents = Boolean(
    contextMenuAny &&
      "Trigger" in contextMenuAny &&
      "Items" in contextMenuAny &&
      expoSwiftUIAny &&
      "RoundedRectangle" in expoSwiftUIAny,
  );

  const canUseNativeProjectActions =
    nativeProjectActionsEnabledByContract &&
    expoSwiftUI !== null &&
    hasNativeContextMenuComponents;
  const canUseNativeEmptyState =
    nativeEmptyStateEnabledByContract && expoSwiftUI !== null;

  const refreshLocalProjects = useCallback(async () => {
    const projects = await listLocalProjects();
    setLocalProjects(projects);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isLocalGuest) {
        setLocalProjects(null);
        setLocalAvatarUrl(null);
        return;
      }

      let isActive = true;
      void (async () => {
        const [projects, localProfile] = await Promise.all([
          listLocalProjects(),
          getLocalArtistProfile(),
        ]);
        if (!isActive) return;
        setLocalProjects(projects);
        setLocalAvatarUrl(localProfile.avatarImageUrl ?? null);
      })();

      return () => {
        isActive = false;
      };
    }, [isLocalGuest]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (isLocalGuest) {
        await refreshLocalProjects();
      } else {
        await convex.query(api.projects.listByUser, {});
      }
    } finally {
      setRefreshing(false);
    }
  }, [convex, isLocalGuest, refreshLocalProjects]);

  const profileAvatarUri = useMemo(() => {
    if (isLocalGuest) return normalizeAvatarUri(localAvatarUrl);
    return normalizeAvatarUri(convexUser?.avatarImageUrl ?? convexUser?.avatarUrl);
  }, [convexUser?.avatarImageUrl, convexUser?.avatarUrl, isLocalGuest, localAvatarUrl]);

  const openProject = useCallback(
    (project: Project) => {
      const projectKey = getProjectId(project);
      if (isSelectionMode) {
        const wasSelected = selectedProjectIds.includes(projectKey);
        void triggerSelectionHaptic(wasSelected ? "toggle-off" : "toggle-on");
        setSelectedProjectIds((prev) =>
          prev.includes(projectKey)
            ? prev.filter((id) => id !== projectKey)
            : [...prev, projectKey],
        );
        return;
      }
      if (deletingProjectId === projectKey) return;
      track("project_reopened", { projectId: projectKey });

      if (isLocalProject(project)) {
        router.push({
          pathname: "/create/editor",
          params: {
            localProjectId: project.id,
            title: project.title ?? "",
            photoUri: encodeUriParam(project.photoUri ?? ""),
            photoName: project.photoName ?? "",
            audioUri: encodeUriParam(project.audioUri ?? ""),
            audioName: project.audioName ?? "",
            aspectRatio: project.aspectRatio,
            templateId: resolveTemplateId(project.templateId),
            templateTweaks: project.templateTweaks ?? "",
            trimStart: String(project.trimStart ?? 0),
            trimEnd: String(project.trimEnd ?? 5),
          },
        });
        return;
      }

      router.push({
        pathname: "/create/editor",
        params: {
          projectId: String(project._id),
          title: project.title ?? "",
          photoName: project.photoName ?? "",
          audioName: project.audioName ?? "",
          aspectRatio: project.aspectRatio,
          templateId: resolveTemplateId(project.templateId),
          templateTweaks: project.templateTweaks ?? "",
          trimStart: String(project.trimStart ?? 0),
          trimEnd: String(project.trimEnd ?? 5),
        },
      });
    },
    [deletingProjectId, isSelectionMode, router, selectedProjectIds, track],
  );

  const closeProjectActions = useCallback(() => {
    setActionProject(null);
  }, []);

  const clearSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedProjectIds([]);
  }, []);

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode((prev) => {
      const next = !prev;
      if (!next) {
        setSelectedProjectIds([]);
      } else {
        closeProjectActions();
      }
      return next;
    });
  }, [closeProjectActions]);

  const openProjectActions = useCallback(
    (project: Project) => {
      if (isSelectionMode) return;
      setActionProject(project);
      track("project_actions_opened", { projectId: getProjectId(project) });
    },
    [isSelectionMode, track],
  );

  const runDeleteProject = useCallback(
    async (project: Project) => {
      const projectKey = getProjectId(project);
      setDeletingProjectId(projectKey);
      try {
        if (isLocalProject(project)) {
          await removeLocalProject(project.id);
          await refreshLocalProjects();
        } else {
          await deleteProject({ projectId: project._id });
        }
        track("project_deleted", { projectId: projectKey });
      } catch {
        Alert.alert(
          "Could not delete project",
          "Please try again in a moment.",
        );
      } finally {
        setDeletingProjectId(null);
      }
    },
    [deleteProject, refreshLocalProjects, track],
  );

  const handleProjectAction = useCallback(
    (project: Project, action: ProjectAction) => {
      if (action === "delete") {
        track("project_delete_started", { projectId: getProjectId(project) });
        Alert.alert(
          "Delete project?",
          "If you choose to delete, you'll lose this project.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: () => {
                void runDeleteProject(project);
              },
            },
          ],
        );
        return;
      }

      closeProjectActions();
      Alert.alert(
        action === "rename" ? "Rename coming soon" : "Duplicate coming soon",
        "This action is part of the next project-management pass.",
      );
    },
    [closeProjectActions, runDeleteProject, track],
  );

  const handleModalProjectAction = useCallback(
    (action: ProjectAction) => {
      const project = actionProject;
      if (!project) return;

      closeProjectActions();
      handleProjectAction(project, action);
    },
    [actionProject, closeProjectActions, handleProjectAction],
  );

  const stableProjects = useMemo(() => {
    if (isLocalGuest) return localProjects ?? [];
    return projectsQuery ?? [];
  }, [isLocalGuest, localProjects, projectsQuery]);
  const isLoading = isLocalGuest ? localProjects === null : projectsQuery === undefined;
  const hasProjects = stableProjects.length > 0;
  const selectedProjects = useMemo(
    () =>
      stableProjects.filter((project) =>
        selectedProjectIds.includes(getProjectId(project)),
      ),
    [selectedProjectIds, stableProjects],
  );

  const runDeleteProjects = useCallback(
    async (projects: Project[]) => {
      if (!projects.length) return;
      setIsBulkDeleting(true);
      let failedCount = 0;
      try {
        for (const project of projects) {
          try {
            if (isLocalProject(project)) {
              await removeLocalProject(project.id);
            } else {
              await deleteProject({ projectId: project._id });
            }
            track("project_deleted", { projectId: getProjectId(project) });
          } catch {
            failedCount += 1;
          }
        }

        if (isLocalGuest) {
          await refreshLocalProjects();
        }

        if (failedCount > 0) {
          Alert.alert(
            "Some projects could not be deleted",
            `${failedCount} project${failedCount === 1 ? "" : "s"} failed to delete.`,
          );
        }
      } finally {
        setIsBulkDeleting(false);
        clearSelectionMode();
      }
    },
    [clearSelectionMode, deleteProject, isLocalGuest, refreshLocalProjects, track],
  );

  const handleBulkDelete = useCallback(() => {
    if (!selectedProjects.length || isBulkDeleting) return;
    track("project_delete_started", {
      projectId: `bulk_${selectedProjects.length}`,
    });
    Alert.alert(
      "Delete selected projects?",
      `This will delete ${selectedProjects.length} project${selectedProjects.length === 1 ? "" : "s"}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void runDeleteProjects(selectedProjects);
          },
        },
      ],
    );
  }, [isBulkDeleting, runDeleteProjects, selectedProjects, track]);

  const renderProjectCard = useCallback(
    ({ item }: { item: Project }) => {
      const projectKey = getProjectId(item);
      const isDeleting = deletingProjectId === projectKey;
      const isSelected = selectedProjectIds.includes(projectKey);
      const title = item.title?.trim() ? item.title : "Untitled Project";
      const canRenderNativeProjectActions =
        canUseNativeProjectActions && expoSwiftUI && !isSelectionMode && !isDeleting;
      const cardContent = (
        <View style={styles.cardContent}>
          <ProjectThumbnail project={item} title={title} />
          <View style={styles.cardBody}>
            <Text numberOfLines={1} style={styles.cardTitle}>
              {title}
            </Text>
            <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>
      );
      const cardSurface = canRenderNativeProjectActions ? (
        cardContent
      ) : (
        <Pressable
          style={({ pressed }) => [
            styles.cardPressable,
            pressed && styles.cardPressed,
          ]}
          onPress={() => openProject(item)}
          disabled={isDeleting}
          accessibilityLabel={
            isSelectionMode
              ? `${isSelected ? "Deselect" : "Select"} ${title}`
              : `Open ${title}`
          }
          accessibilityRole="button"
          accessibilityState={{ disabled: isDeleting }}
        >
          {cardContent}
        </Pressable>
      );

      return (
        <View style={[styles.card, isSelectionMode && isSelected && styles.cardSelected]}>
          {isSelectionMode ? (
            <View
              style={[
                styles.cardSelectBadge,
                isSelected && styles.cardSelectBadgeSelected,
              ]}
            >
              <Ionicons
                name={isSelected ? "checkmark" : "ellipse-outline"}
                size={14}
                color={isSelected ? colors.light.background : colors.light.textSecondary}
              />
            </View>
          ) : null}

          {cardSurface}

          {canRenderNativeProjectActions && expoSwiftUI ? (
            <expoSwiftUI.Host style={styles.nativeCardContextMenuOverlay}>
              <expoSwiftUI.ContextMenu activationMethod="longPress">
                <NativeProjectContextMenuItems
                  expoSwiftUI={expoSwiftUI}
                  isDeleting={isDeleting}
                  onAction={(action) => {
                    track("project_actions_opened", { projectId: projectKey });
                    handleProjectAction(item, action);
                  }}
                />
                <expoSwiftUI.ContextMenu.Trigger>
                  <expoSwiftUI.RoundedRectangle
                    cornerRadius={radius.md}
                    modifiers={[
                      swiftUIOpacity(0.015),
                      swiftUIOnTapGesture(() => openProject(item)),
                      swiftUIAccessibilityLabel(
                        `Open ${title}. Long press for project actions.`,
                      ),
                    ]}
                  />
                </expoSwiftUI.ContextMenu.Trigger>
              </expoSwiftUI.ContextMenu>
            </expoSwiftUI.Host>
          ) : null}

          {!isSelectionMode ? (
            canRenderNativeProjectActions ? null : (
              <Pressable
                style={styles.cardMenuButton}
                onPress={() => openProjectActions(item)}
                disabled={isDeleting}
                accessibilityLabel={`Project actions for ${title}`}
                accessibilityRole="button"
                accessibilityState={{ disabled: isDeleting }}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color={colors.light.textSecondary} />
                ) : (
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={16}
                    color={colors.light.text}
                  />
                )}
              </Pressable>
            )
          ) : null}
        </View>
      );
    },
    [
      canUseNativeProjectActions,
      deletingProjectId,
      expoSwiftUI,
      handleProjectAction,
      isSelectionMode,
      openProject,
      openProjectActions,
      selectedProjectIds,
      track,
    ],
  );

  const isDeletingSelectedProject =
    !!actionProject && deletingProjectId === getProjectId(actionProject);
  const selectedCount = selectedProjectIds.length;
  const isCancelSelectionAction = selectedCount === 0;
  const bulkDeleteBottom = Math.max(90, insets.bottom + 68);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isSelectionMode ? `${selectedCount} Selected` : "Projects"}
        </Text>
        <View style={styles.headerActions}>
          <Pressable
            style={styles.selectModeButton}
            onPress={isSelectionMode ? clearSelectionMode : toggleSelectionMode}
            accessibilityLabel={
              isSelectionMode ? "Exit multi-select mode" : "Enter multi-select mode"
            }
            accessibilityRole="button"
          >
            <Ionicons
              name={isSelectionMode ? "close-outline" : "checkbox-outline"}
              size={20}
              color={colors.light.text}
            />
          </Pressable>
          <Pressable
            style={styles.avatarButton}
            onPress={() => router.push("/profile")}
            accessibilityLabel="Open profile"
            accessibilityRole="button"
          >
            {profileAvatarUri ? (
              <Image source={{ uri: profileAvatarUri }} style={styles.avatarImage} />
            ) : (
              <Ionicons
                name="person-circle-outline"
                size={32}
                color={colors.light.text}
              />
            )}
          </Pressable>
        </View>
      </View>

      {/* TODO: Add cursor pagination if project history grows beyond v1 size. */}
      <FlatList
        data={isLoading ? [] : stableProjects}
        keyExtractor={(item) => getProjectId(item)}
        renderItem={renderProjectCard}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[
          styles.listContent,
          !hasProjects && styles.listContentEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent.primary}
          />
        }
        ListEmptyComponent={
          isLoading ? null : (
            canUseNativeEmptyState && expoSwiftUI ? (
              <expoSwiftUI.Host
                style={styles.nativeEmptyStateHost}
                useViewportSizeMeasurement
              >
                <expoSwiftUI.ContentUnavailableView
                  title="Create your first promo"
                  description="Tap + to get started"
                  systemImage="film.stack"
                />
              </expoSwiftUI.Host>
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons
                    name="film-outline"
                    size={48}
                    color={colors.light.textSecondary}
                  />
                </View>
                <Text style={styles.emptyTitle}>Create your first promo</Text>
                <Text style={styles.emptySubtitle}>Tap + to get started</Text>
              </View>
            )
          )
        }
      />

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      )}

      <Modal
        visible={!!actionProject}
        transparent
        animationType="fade"
        onRequestClose={closeProjectActions}
      >
        <Pressable
          style={styles.actionsBackdrop}
          onPress={closeProjectActions}
          accessibilityLabel="Dismiss project actions"
          accessibilityRole="button"
        />

        <View style={styles.actionsOverlay} pointerEvents="box-none">
          {actionProject ? (
            <>
              <View style={styles.actionsCard}>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionsRow,
                    pressed && styles.actionsRowPressed,
                  ]}
                  onPress={() => handleModalProjectAction("rename")}
                  accessibilityLabel="Rename project"
                  accessibilityRole="button"
                >
                  <Ionicons
                    name="create-outline"
                    size={18}
                    color={colors.light.text}
                  />
                  <Text style={styles.actionsText}>Rename</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.actionsRow,
                    pressed && styles.actionsRowPressed,
                  ]}
                  onPress={() => handleModalProjectAction("duplicate")}
                  accessibilityLabel="Duplicate project"
                  accessibilityRole="button"
                >
                  <Ionicons
                    name="copy-outline"
                    size={18}
                    color={colors.light.text}
                  />
                  <Text style={styles.actionsText}>Duplicate</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.actionsRow,
                    pressed && styles.actionsRowPressed,
                  ]}
                  onPress={() => handleModalProjectAction("delete")}
                  disabled={isDeletingSelectedProject}
                  accessibilityLabel="Delete project"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isDeletingSelectedProject }}
                >
                  {isDeletingSelectedProject ? (
                    <ActivityIndicator size="small" color={colors.accent.error} />
                  ) : (
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={colors.accent.error}
                    />
                  )}
                  <Text style={styles.actionsDeleteText}>Delete</Text>
                </Pressable>
              </View>
            </>
          ) : null}
        </View>
      </Modal>

      {isSelectionMode ? (
        <Pressable
          style={({ pressed }) => [
            styles.bulkDeleteButton,
            { bottom: bulkDeleteBottom },
            isCancelSelectionAction && styles.bulkDeleteButtonCancel,
            isBulkDeleting && styles.bulkDeleteButtonDisabled,
            pressed && !isBulkDeleting && styles.bulkDeleteButtonPressed,
          ]}
          onPress={isCancelSelectionAction ? clearSelectionMode : handleBulkDelete}
          disabled={isBulkDeleting}
          accessibilityLabel={
            isCancelSelectionAction ? "Cancel selection mode" : "Delete selected projects"
          }
          accessibilityRole="button"
          accessibilityState={{ disabled: isBulkDeleting }}
        >
          {isBulkDeleting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons
                name={isCancelSelectionAction ? "close" : "trash-outline"}
                size={18}
                color="#FFFFFF"
              />
              <Text
                style={[
                  styles.bulkDeleteText,
                  isCancelSelectionAction && styles.bulkDeleteTextCancel,
                ]}
              >
                {isCancelSelectionAction ? "Cancel" : `Delete (${selectedCount})`}
              </Text>
            </>
          )}
        </Pressable>
      ) : (
        <Pressable
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          onPress={() => router.push("/create/picker" as const)}
          accessibilityLabel="Create new project"
          accessibilityRole="button"
        >
          <Ionicons name="add" size={28} color={colors.accent.fabIcon} />
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
    position: "relative",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.light.text,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  selectModeButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.light.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  nativeEmptyStateHost: {
    flex: 1,
    minHeight: 320,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: colors.light.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.light.text,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.light.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.select({ ios: 106, android: 92, default: 92 }),
    paddingTop: spacing.xs,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  row: {
    gap: spacing.sm,
  },
  card: {
    flex: 1,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.light.surface,
    overflow: "hidden",
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: colors.accent.primary,
  },
  cardPressable: {
    flex: 1,
  },
  cardContent: {
    flex: 1,
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  nativeCardContextMenuOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4,
  },
  cardMenuButton: {
    position: "absolute",
    top: spacing.xs,
    right: spacing.xs,
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardSelectBadge: {
    position: "absolute",
    top: spacing.xs,
    left: spacing.xs,
    width: 26,
    height: 26,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },
  cardSelectBadgeSelected: {
    backgroundColor: colors.accent.primary,
  },
  thumbnail: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: colors.light.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  cardBody: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  cardTitle: {
    ...typography.body,
    color: colors.light.text,
    fontWeight: "600",
  },
  cardDate: {
    ...typography.caption,
    color: colors.light.textSecondary,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  actionsBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.22)",
  },
  actionsOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  actionsCard: {
    width: "100%",
    maxWidth: 240,
    borderRadius: radius.lg,
    backgroundColor: colors.light.background,
    overflow: "hidden",
  },
  actionsRow: {
    minHeight: 54,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.light.border,
  },
  actionsRowPressed: {
    backgroundColor: colors.light.surface,
  },
  actionsText: {
    ...typography.body,
    color: colors.light.text,
    fontWeight: "500",
  },
  actionsDeleteText: {
    ...typography.body,
    color: colors.accent.error,
    fontWeight: "500",
  },
  fab: {
    position: "absolute",
    bottom: 100,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.accent.fab,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabPressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.9,
  },
  bulkDeleteButton: {
    position: "absolute",
    alignSelf: "center",
    bottom: 20,
    minHeight: 48,
    minWidth: 210,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    backgroundColor: colors.accent.error,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.xs,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 7,
    elevation: 4,
  },
  bulkDeleteButtonDisabled: {
    opacity: 0.5,
  },
  bulkDeleteButtonCancel: {
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#111111",
  },
  bulkDeleteButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  bulkDeleteText: {
    ...typography.button,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  bulkDeleteTextCancel: {
    color: "#FFFFFF",
  },
});
