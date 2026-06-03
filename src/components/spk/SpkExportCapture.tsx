import type { ComponentProps, RefObject } from "react";
import { View, StyleSheet } from "react-native";
import ViewShot, { type ViewShotRef } from "react-native-view-shot";
import { SPK_CAPTURE_OPTIONS, SPK_SLIDE_HEIGHT, SPK_SLIDE_WIDTH } from "@/lib/spkSlideDimensions";
import { SpkBioSlide } from "./SpkBioSlide";
import { SpkCoverSlide } from "./SpkCoverSlide";
import { SpkTrackDetailsSlide } from "./SpkTrackDetailsSlide";
import { SpkVisionSlide } from "./SpkVisionSlide";

const exportFrameStyle = {
  width: SPK_SLIDE_WIDTH,
  height: SPK_SLIDE_HEIGHT,
  backgroundColor: "#000000",
  overflow: "hidden" as const,
};

export type SpkExportCaptureProps = {
  exportRefs: [
    RefObject<ViewShotRef | null>,
    RefObject<ViewShotRef | null>,
    RefObject<ViewShotRef | null>,
    RefObject<ViewShotRef | null>,
  ];
  cover: ComponentProps<typeof SpkCoverSlide>;
  track: ComponentProps<typeof SpkTrackDetailsSlide>;
  vision: ComponentProps<typeof SpkVisionSlide>;
  bio: ComponentProps<typeof SpkBioSlide>;
};

/**
 * Off-screen slide tree used only for export. Capturing inside the horizontal
 * carousel ScrollView leaves a blank (white in JPEG) strip at the bottom on
 * Android; see react-native-view-shot ViewShot.java ("blank tail").
 */
export function SpkExportCapture({ exportRefs, cover, track, vision, bio }: SpkExportCaptureProps) {
  return (
    <View style={styles.offscreen} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <ViewShot ref={exportRefs[0]} style={exportFrameStyle} options={SPK_CAPTURE_OPTIONS}>
        <SpkCoverSlide {...cover} />
      </ViewShot>
      <ViewShot ref={exportRefs[1]} style={exportFrameStyle} options={SPK_CAPTURE_OPTIONS}>
        <SpkTrackDetailsSlide {...track} />
      </ViewShot>
      <ViewShot ref={exportRefs[2]} style={exportFrameStyle} options={SPK_CAPTURE_OPTIONS}>
        <SpkVisionSlide {...vision} />
      </ViewShot>
      <ViewShot ref={exportRefs[3]} style={exportFrameStyle} options={SPK_CAPTURE_OPTIONS}>
        <SpkBioSlide {...bio} />
      </ViewShot>
    </View>
  );
}

const styles = StyleSheet.create({
  offscreen: {
    position: "absolute",
    top: 0,
    left: -10000,
  },
});
