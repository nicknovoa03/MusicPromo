import { StyleSheet, View } from "react-native";
import type { FlyerDraftInput, FlyerTemplateId } from "@/lib/flyerDraft";
import {
  FLYER_PREVIEW_ASPECT_RATIO,
  flyerExportSize,
  previewSizeForDisplay,
} from "@/lib/flyerDimensions";
import { FlyerTemplateView } from "./FlyerTemplateView";

type FlyerPreviewFrameProps = {
  draft: FlyerDraftInput;
  templateId?: FlyerTemplateId;
  /** Defaults to 4:5 for editor; pass draft aspect on export. */
  aspectRatio?: FlyerDraftInput["aspectRatio"];
  maxWidth: number;
  maxHeight?: number;
  borderRadius?: number;
};

/**
 * Renders the flyer at export resolution for the given aspect ratio, then scales
 * down to fit the display box.
 */
export function FlyerPreviewFrame({
  draft,
  templateId,
  aspectRatio = FLYER_PREVIEW_ASPECT_RATIO,
  maxWidth,
  maxHeight,
  borderRadius,
}: FlyerPreviewFrameProps) {
  const exportSize = flyerExportSize(aspectRatio);
  const display = previewSizeForDisplay(aspectRatio, maxWidth, maxHeight);
  const scale = display.width / exportSize.width;

  return (
    <View
      style={[
        styles.clip,
        {
          width: display.width,
          height: display.height,
          borderRadius,
        },
      ]}
    >
      <View
        style={[
          styles.canvas,
          {
            width: exportSize.width,
            height: exportSize.height,
            transform: [{ scale }],
            transformOrigin: "top left",
          },
        ]}
      >
        <FlyerTemplateView
          draft={draft}
          templateId={templateId}
          aspectRatio={aspectRatio}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: "hidden",
    backgroundColor: "#111",
  },
  canvas: {
    // Scale from top-left so the preview fills the clip box on iOS and web.
  },
});
