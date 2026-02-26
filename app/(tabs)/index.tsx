import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  Image,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useConvex, useQuery } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { usePostHog } from "posthog-react-native";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { colors, typography, spacing, radius } from "@/constants/tokens";
import type { EventName } from "@/lib/analytics";

type Project = Doc<"projects">;

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function mediaNameFromUri(uri?: string) {
  if (!uri) return "";
  const withoutQuery = uri.split("?")[0] ?? uri;
  const rawName = withoutQuery.split("/").pop() ?? "";
  return decodeURIComponent(rawName);
}

export default function HomeScreen() {
  const router = useRouter();
  const convex = useConvex();
  const posthog = usePostHog();
  const projectsQuery = useQuery(api.projects.listByUser);
  const [projects, setProjects] = useState<Project[] | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (projectsQuery !== undefined) {
      setProjects(projectsQuery);
    }
  }, [projectsQuery]);

  const track = useCallback(
    (event: EventName, props?: Record<string, string>) => {
      posthog?.capture(event, props);
    },
    [posthog],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const latestProjects = await convex.query(api.projects.listByUser, {});
      setProjects(latestProjects);
    } finally {
      setRefreshing(false);
    }
  }, [convex]);

  const openProject = useCallback(
    (project: Project) => {
      track("project_reopened", { projectId: String(project._id) });

      router.push({
        pathname: "/create/editor",
        params: {
          projectId: String(project._id),
          title: project.title ?? "",
          photoUri: project.photoUri ?? "",
          photoName: mediaNameFromUri(project.photoUri) || "Photo",
          audioUri: project.audioUri ?? "",
          audioName: mediaNameFromUri(project.audioUri) || "Audio",
          aspectRatio: project.aspectRatio,
          trimStart: String(project.trimStart ?? 0),
          trimEnd: String(project.trimEnd ?? 30),
        },
      });
    },
    [router, track],
  );

  const stableProjects = useMemo(() => projects ?? [], [projects]);
  const isLoading = projectsQuery === undefined && projects === undefined;
  const hasProjects = stableProjects.length > 0;

  const renderProjectCard = useCallback(
    ({ item }: { item: Project }) => {
      const previewUri = item.photoUri ?? item.exportedVideoUri;
      return (
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => openProject(item)}
          accessibilityLabel={`Open ${item.title ?? "Untitled Project"}`}
          accessibilityRole="button"
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
      );
    },
    [openProject],
  );

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
        keyExtractor={(item) => String(item._id)}
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
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
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
