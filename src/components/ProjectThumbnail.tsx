import { useMemo, useState } from "react";
import { View, Image, StyleSheet, Text } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { Doc } from "../../convex/_generated/dataModel";
import { isLocalProject, type LocalProject } from "@/lib/localProjects";
import { normalizeMediaUri } from "@/lib/mediaUri";
import {
  getTemplateDefinition,
  parseTemplateTweaksParam,
  resolveTemplateId,
} from "@/lib/templates";
import { colors } from "@/constants/tokens";

type Project = Doc<"projects"> | LocalProject;

type Props = {
  project: Project;
  title: string;
  surfaceColor: string;
  fallbackIconColor: string;
};

const BASE_RENDER_SIZE = 300;
let _cachedThumbnailWidth = 0;

export function ProjectThumbnail({ project, title, surfaceColor, fallbackIconColor }: Props) {
  const [thumbnailSize, setThumbnailSize] = useState(_cachedThumbnailWidth);
  const photoUri = normalizeMediaUri(project.photoUri);
  const fallbackPreviewUri = normalizeMediaUri(project.exportedVideoUri);

  const isEpk = !isLocalProject(project) && project.type === "epk";

  if (isEpk) {
    return (
      <View
        style={[styles.thumbnail, { backgroundColor: "#0A0A0A" }]}
        onLayout={(event) => {
          const nextSize = Math.round(event.nativeEvent.layout.width);
          if (nextSize !== _cachedThumbnailWidth) _cachedThumbnailWidth = nextSize;
          setThumbnailSize((current) => (current === nextSize ? current : nextSize));
        }}
      >
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.thumbnailImage} resizeMode="cover" />
        ) : (
          <Ionicons name="layers-outline" size={30} color={fallbackIconColor} />
        )}
        <View style={styles.epkBadge}>
          <Text style={styles.epkBadgeText}>EPK</Text>
        </View>
      </View>
    );
  }

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
  const scale = thumbnailSize / BASE_RENDER_SIZE;

  return (
    <View
      style={[styles.thumbnail, { backgroundColor: surfaceColor }]}
      onLayout={(event) => {
        const nextSize = Math.round(event.nativeEvent.layout.width);
        if (nextSize !== _cachedThumbnailWidth) _cachedThumbnailWidth = nextSize;
        setThumbnailSize((current) => (current === nextSize ? current : nextSize));
      }}
    >
      {canRenderTemplateThumbnail ? (
        <View style={{ transform: [{ scale }] }}>
          <TemplateStageComponent
            width={BASE_RENDER_SIZE}
            height={BASE_RENDER_SIZE}
            aspectRatio={project.aspectRatio}
            photoUri={photoUri}
            isPlaying={false}
            playbackLabel="Project thumbnail"
            trackTitle={title}
            subtitle={templateDefinition.name}
            templateTweaks={templateTweaks ?? undefined}
            showWatermark={false}
          />
        </View>
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
          color={fallbackIconColor}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  thumbnail: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: colors.light.surface,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  epkBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    backgroundColor: "rgba(0,0,0,0.72)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  epkBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
});
