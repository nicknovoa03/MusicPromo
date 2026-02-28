import { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  Image,
  RefreshControl,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { useConvex, useMutation, useQuery } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { usePostHog } from "posthog-react-native";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { colors, typography, spacing, radius } from "@/constants/tokens";
import type { EventName } from "@/lib/analytics";
import { encodeUriParam } from "@/lib/uri";
import { useLocalSession } from "@/providers/localSession";
import {
  listLocalProjects,
  removeLocalProject,
  type LocalProject,
} from "@/lib/localProjects";

type Project = Doc<"projects"> | LocalProject;

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

export default function HomeScreen() {
  const router = useRouter();
  const convex = useConvex();
  const posthog = usePostHog();
  const { isLocalGuest } = useLocalSession();
  const projectsQuery = useQuery(api.projects.listByUser);
  const deleteProject = useMutation(api.projects.remove);
  const [localProjects, setLocalProjects] = useState<LocalProject[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [actionProject, setActionProject] = useState<Project | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const longPressProjectIdRef = useRef<string | null>(null);

  const track = useCallback(
    (event: EventName, props?: Record<string, string>) => {
      posthog?.capture(event, props);
    },
    [posthog],
  );

  const refreshLocalProjects = useCallback(async () => {
    const projects = await listLocalProjects();
    setLocalProjects(projects);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isLocalGuest) {
        setLocalProjects(null);
        return;
      }

      let isActive = true;
      void (async () => {
        const projects = await listLocalProjects();
        if (!isActive) return;
        setLocalProjects(projects);
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

  const openProject = useCallback(
    (project: Project) => {
      const projectKey = getProjectId(project);
      if (longPressProjectIdRef.current === projectKey) {
        longPressProjectIdRef.current = null;
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
            trimStart: String(project.trimStart ?? 0),
            trimEnd: String(project.trimEnd ?? 30),
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
          trimStart: String(project.trimStart ?? 0),
          trimEnd: String(project.trimEnd ?? 30),
        },
      });
    },
    [deletingProjectId, router, track],
  );

  const closeProjectActions = useCallback(() => {
    setActionProject(null);
  }, []);

  const openProjectActions = useCallback(
    (project: Project) => {
      setActionProject(project);
      track("project_actions_opened", { projectId: getProjectId(project) });
    },
    [track],
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
    (action: "rename" | "duplicate" | "delete") => {
      const project = actionProject;
      if (!project) return;

      if (action === "delete") {
        closeProjectActions();
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
    [actionProject, closeProjectActions, runDeleteProject, track],
  );

  const stableProjects = useMemo(() => {
    if (isLocalGuest) return localProjects ?? [];
    return projectsQuery ?? [];
  }, [isLocalGuest, localProjects, projectsQuery]);
  const isLoading = isLocalGuest ? localProjects === null : projectsQuery === undefined;
  const hasProjects = stableProjects.length > 0;

  const renderProjectCard = useCallback(
    ({ item }: { item: Project }) => {
      const projectKey = getProjectId(item);
      const previewUri = item.photoUri ?? item.exportedVideoUri;
      const isDeleting = deletingProjectId === projectKey;

      return (
        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [
              styles.cardPressable,
              pressed && styles.cardPressed,
            ]}
            onPress={() => openProject(item)}
            onLongPress={() => {
              longPressProjectIdRef.current = projectKey;
              openProjectActions(item);
            }}
            delayLongPress={220}
            disabled={isDeleting}
            accessibilityLabel={`Open ${item.title ?? "Untitled Project"}`}
            accessibilityRole="button"
            accessibilityState={{ disabled: isDeleting }}
          >
            <View style={styles.thumbnail}>
              {previewUri ? (
                <Image
                  source={{ uri: previewUri }}
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
            <View style={styles.cardBody}>
              <Text numberOfLines={1} style={styles.cardTitle}>
                {item.title?.trim() ? item.title : "Untitled Project"}
              </Text>
              <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
            </View>
          </Pressable>

          <Pressable
            style={styles.cardMenuButton}
            onPress={() => openProjectActions(item)}
            disabled={isDeleting}
            accessibilityLabel={`Project actions for ${item.title ?? "Untitled Project"}`}
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
        </View>
      );
    },
    [deletingProjectId, openProject, openProjectActions],
  );

  const isDeletingSelectedProject =
    !!actionProject && deletingProjectId === getProjectId(actionProject);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Projects</Text>
        <Pressable
          style={styles.avatarButton}
          onPress={() => router.push("/(tabs)/profile")}
          accessibilityLabel="Open profile"
          accessibilityRole="button"
        >
          <Ionicons
            name="person-circle-outline"
            size={32}
            color={colors.light.text}
          />
        </Pressable>
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
                  onPress={() => handleProjectAction("rename")}
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
                  onPress={() => handleProjectAction("duplicate")}
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
                  onPress={() => handleProjectAction("delete")}
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

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => router.push("/create/picker" as const)}
        accessibilityLabel="Create new project"
        accessibilityRole="button"
      >
        <Ionicons name="add" size={28} color={colors.accent.fabIcon} />
      </Pressable>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.light.text,
  },
  avatarButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
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
    paddingBottom: 140,
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
  cardPressable: {
    flex: 1,
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
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
});
