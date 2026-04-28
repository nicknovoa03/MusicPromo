import { useMemo, useState } from "react";
import { View, Image, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { Doc } from "../../convex/_generated/dataModel";
import type { LocalProject } from "@/lib/localProjects";
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
});
