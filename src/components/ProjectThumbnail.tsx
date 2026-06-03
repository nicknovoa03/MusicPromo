import { useMemo, useState } from "react";
import { View, Image, StyleSheet, Text } from "react-native";
import { useFonts } from "expo-font";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { Doc } from "../../convex/_generated/dataModel";
import { isLocalProject, type LocalProject } from "@/lib/localProjects";
import { uriForImageSource } from "@/lib/mediaUri";
import {
  convexProjectToFlyerDraft,
  localProjectToFlyerDraft,
} from "@/lib/flyerDraft";
import {
  getTemplateDefinition,
  parseTemplateTweaksParam,
  resolveTemplateId,
} from "@/lib/templates";
import { FlyerPreviewFrame } from "@/components/flyer/FlyerPreviewFrame";
import { FLYER_FONT_SOURCES } from "@/lib/flyerFonts";
import { colors, radius } from "@/constants/tokens";

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
  const photoUri = uriForImageSource(project.photoUri);
  const fallbackPreviewUri = uriForImageSource(project.exportedVideoUri);

  const isSpk = project.type === "spk";
  const isFlyer = project.type === "flyer";

  if (isSpk) {
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
        <View style={styles.spkBadge}>
          <Text style={styles.spkBadgeText}>SPK</Text>
        </View>
      </View>
    );
  }

  if (isFlyer) {
    return (
      <FlyerProjectThumbnail
        project={project}
        thumbnailSize={thumbnailSize}
        fallbackPreviewUri={fallbackPreviewUri}
        fallbackIconColor={fallbackIconColor}
        onLayout={(nextSize) => {
          if (nextSize !== _cachedThumbnailWidth) _cachedThumbnailWidth = nextSize;
          setThumbnailSize((current) => (current === nextSize ? current : nextSize));
        }}
      />
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

type FlyerProjectThumbnailProps = {
  project: Project;
  thumbnailSize: number;
  fallbackPreviewUri: string | null;
  fallbackIconColor: string;
  onLayout: (size: number) => void;
};

function FlyerProjectThumbnail({
  project,
  thumbnailSize,
  fallbackPreviewUri,
  fallbackIconColor,
  onLayout,
}: FlyerProjectThumbnailProps) {
  const [fontsLoaded] = useFonts(FLYER_FONT_SOURCES);
  const flyerDraft = useMemo(
    () =>
      isLocalProject(project)
        ? localProjectToFlyerDraft(project)
        : convexProjectToFlyerDraft(project),
    [project],
  );
  const aspectRatio = flyerDraft.aspectRatio ?? "9:16";
  const photoUri = uriForImageSource(project.photoUri);

  return (
    <View
      style={[styles.thumbnail, { backgroundColor: "#111" }]}
      onLayout={(event) => {
        onLayout(Math.round(event.nativeEvent.layout.width));
      }}
    >
      {thumbnailSize > 0 && fontsLoaded ? (
        <FlyerPreviewFrame
          draft={flyerDraft}
          aspectRatio={aspectRatio}
          maxWidth={thumbnailSize}
          maxHeight={thumbnailSize}
        />
      ) : photoUri ? (
        <Image source={{ uri: photoUri }} style={styles.thumbnailImage} resizeMode="cover" />
      ) : fallbackPreviewUri ? (
        <Image
          source={{ uri: fallbackPreviewUri }}
          style={styles.thumbnailImage}
          resizeMode="cover"
        />
      ) : (
        <Ionicons name="calendar-outline" size={30} color={fallbackIconColor} />
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
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  spkBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#11131A",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  spkBadgeText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
});
