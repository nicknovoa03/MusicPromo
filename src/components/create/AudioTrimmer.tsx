import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  StyleSheet,
  PanResponder,
  Text,
  LayoutChangeEvent,
  GestureResponderEvent,
  PanResponderGestureState,
  Pressable,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { colors, spacing, radius, typography } from "@/constants/tokens";
interface AudioTrimmerProps {
  durationSec: number;
  startSec: number;
  endSec: number;
  onTrimChange: (start: number, end: number) => void;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  minDuration?: number;
  maxDuration?: number;
}

const TIMELINE_FRAME_COUNT = 74;
const WAVEFORM_ZOOM_FACTOR = 2.4;
const WAVEFORM_BAR_COUNT = Math.round(
  TIMELINE_FRAME_COUNT * WAVEFORM_ZOOM_FACTOR,
);
const DURATION_WHEEL_HEIGHT = 190;

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

function toWholeSecondLabel(seconds: number): string {
  return `${Math.round(seconds)}`;
}

export function AudioTrimmer({
  durationSec,
  startSec,
  endSec,
  onTrimChange,
  isPlaying = false,
  onTogglePlay,
  minDuration = 15,
  maxDuration = Number.POSITIVE_INFINITY,
}: AudioTrimmerProps) {
  const safeDuration = Number.isFinite(durationSec) ? Math.max(durationSec, 1) : 1;
  const maxSelectableDuration = Math.max(
    Math.min(maxDuration, safeDuration),
    Math.min(minDuration, safeDuration),
  );
  const currentDuration = clamp(
    endSec - startSec,
    Math.min(minDuration, safeDuration),
    maxSelectableDuration,
  );
  const safeStart = clamp(startSec, 0, Math.max(safeDuration - currentDuration, 0));
  const safeEnd = safeStart + currentDuration;
  const maxStart = Math.max(safeDuration - currentDuration, 0);

  const [isDurationPickerVisible, setIsDurationPickerVisible] = useState(false);
  const [durationDraftSec, setDurationDraftSec] = useState(Math.round(currentDuration));
  const [trimProgressSec, setTrimProgressSec] = useState(0);
  const [trackLayoutReady, setTrackLayoutReady] = useState(false);
  const [trackWidth, setTrackWidth] = useState(0);
  const [railWidth, setRailWidth] = useState(0);
  const lastProgressTickRef = useRef<number | null>(null);
  const didAutoPauseRef = useRef(false);
  const shouldAutoPauseRef = useRef(false);

  const onTrimChangeRef = useRef(onTrimChange);
  const railGestureStartRef = useRef(safeStart);
  const selectionGestureStartRef = useRef(safeStart);
  const latestValuesRef = useRef({
    safeDuration,
    safeStart,
    currentDuration,
    maxStart,
    trackWidth,
    railWidth,
  });

  useEffect(() => {
    onTrimChangeRef.current = onTrimChange;
  }, [onTrimChange]);

  useEffect(() => {
    latestValuesRef.current = {
      safeDuration,
      safeStart,
      currentDuration,
      maxStart,
      trackWidth,
      railWidth,
    };
  }, [safeDuration, safeStart, currentDuration, maxStart, trackWidth, railWidth]);

  const onTrackLayout = useCallback((e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
    setTrackLayoutReady(true);
  }, []);

  const onRailLayout = useCallback((e: LayoutChangeEvent) => {
    setRailWidth(e.nativeEvent.layout.width);
  }, []);

  const secToX = useCallback(
    (sec: number) => (trackWidth > 0 ? (sec / safeDuration) * trackWidth : 0),
    [trackWidth, safeDuration],
  );

  const applyStart = useCallback(
    (requestedStartSec: number, fixedDurationSec: number) => {
      const clampedStart = clamp(
        requestedStartSec,
        0,
        Math.max(safeDuration - fixedDurationSec, 0),
      );
      onTrimChangeRef.current(clampedStart, clampedStart + fixedDurationSec);
    },
    [safeDuration],
  );

  const durationPickerOptions = useMemo(() => {
    const lower = Math.max(1, Math.round(Math.min(minDuration, safeDuration)));
    const upper = Math.max(lower, Math.round(maxSelectableDuration));
    const range = upper - lower;
    const step = range <= 240 ? 1 : 5;
    const options: number[] = [];
    for (let value = lower; value <= upper; value += step) {
      options.push(value);
    }
    if (options[options.length - 1] !== upper) {
      options.push(upper);
    }
    return options;
  }, [maxSelectableDuration, minDuration, safeDuration]);

  const openDurationPicker = useCallback(() => {
    const nearest = durationPickerOptions.reduce((best, candidate) =>
      Math.abs(candidate - currentDuration) < Math.abs(best - currentDuration)
        ? candidate
        : best,
    );
    setDurationDraftSec(nearest);
    setIsDurationPickerVisible(true);
  }, [currentDuration, durationPickerOptions]);

  const applyDurationDraft = useCallback(() => {
    const nextDuration = clamp(
      durationDraftSec,
      Math.min(minDuration, safeDuration),
      maxSelectableDuration,
    );
    const centeredStart = safeStart + currentDuration / 2 - nextDuration / 2;
    applyStart(centeredStart, nextDuration);
    setIsDurationPickerVisible(false);
  }, [
    applyStart,
    currentDuration,
    durationDraftSec,
    maxSelectableDuration,
    minDuration,
    safeDuration,
    safeStart,
  ]);

  const handleRailPress = useCallback(
    (event: GestureResponderEvent) => {
      const width = railWidth;
      if (width <= 0) return;
      const progress = clamp(event.nativeEvent.locationX / width, 0, 1);
      applyStart(progress * maxStart, currentDuration);
    },
    [applyStart, currentDuration, maxStart, railWidth],
  );

  const railThumbPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          railGestureStartRef.current = latestValuesRef.current.safeStart;
        },
        onPanResponderMove: (
          _: GestureResponderEvent,
          gestureState: PanResponderGestureState,
        ) => {
          const {
            safeDuration: latestSafeDuration,
            railWidth: latestRailWidth,
            currentDuration: latestCurrentDuration,
            maxStart: latestMaxStart,
          } = latestValuesRef.current;
          if (latestRailWidth <= 0) return;

          const deltaSec = (gestureState.dx / latestRailWidth) * latestSafeDuration;
          const nextStart = clamp(railGestureStartRef.current + deltaSec, 0, latestMaxStart);
          applyStart(nextStart, latestCurrentDuration);
        },
      }),
    [applyStart],
  );

  const selectionLeft = secToX(safeStart);
  const minSelectionVisualWidth = clamp(trackWidth * 0.36, 96, 170);
  const selectionWidth = Math.max(
    secToX(safeEnd) - selectionLeft,
    minSelectionVisualWidth,
  );
  const centeredSelectionLeft = Math.max((trackWidth - selectionWidth) / 2, 0);
  const centeredSelectionRight = Math.max(
    trackWidth - centeredSelectionLeft - selectionWidth,
    0,
  );
  const waveformLeadingInset = centeredSelectionLeft;
  const waveformTrailingInset = centeredSelectionRight;
  const waveformContentWidth = Math.max(
    trackWidth * WAVEFORM_ZOOM_FACTOR +
      waveformLeadingInset +
      waveformTrailingInset,
    trackWidth,
  );
  const waveformScrollableWidth = Math.max(waveformContentWidth - trackWidth, 0);
  const railProgress = maxStart > 0 ? safeStart / maxStart : 0;
  const waveformTranslateX = -(railProgress * waveformScrollableWidth);
  const railThumbLeft = railWidth > 0 ? railProgress * railWidth : 0;
  const progressRatio =
    currentDuration > 0 ? clamp(trimProgressSec / currentDuration, 0, 1) : 0;
  const selectionProgressWidth = selectionWidth * progressRatio;
  const selectionProgressHeadLeft = clamp(
    selectionProgressWidth - 1,
    0,
    Math.max(selectionWidth - 2, 0),
  );

  const selectionWindowPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          selectionGestureStartRef.current = latestValuesRef.current.safeStart;
        },
        onPanResponderMove: (
          _: GestureResponderEvent,
          gestureState: PanResponderGestureState,
        ) => {
          const {
            safeDuration: latestSafeDuration,
            currentDuration: latestCurrentDuration,
            maxStart: latestMaxStart,
            trackWidth: latestTrackWidth,
          } = latestValuesRef.current;
          const latestSelectionWidth = Math.max(
            latestTrackWidth > 0
              ? (latestCurrentDuration / latestSafeDuration) * latestTrackWidth
              : 0,
            clamp(latestTrackWidth * 0.36, 96, 170),
          );
          const latestWaveformScrollableWidth = Math.max(
            latestTrackWidth * WAVEFORM_ZOOM_FACTOR - latestSelectionWidth,
            0,
          );

          if (latestWaveformScrollableWidth <= 0 || latestMaxStart <= 0) return;

          const deltaStart =
            -(gestureState.dx / latestWaveformScrollableWidth) * latestMaxStart;
          const nextStart = clamp(
            selectionGestureStartRef.current + deltaStart,
            0,
            latestMaxStart,
          );
          applyStart(nextStart, latestCurrentDuration);
        },
      }),
    [applyStart],
  );

  const waveformBars = useMemo(
    () =>
      Array.from({ length: WAVEFORM_BAR_COUNT }, (_, i) => {
        const envelope = (Math.sin(i * 0.34 + safeDuration * 0.13) + 1) / 2;
        const texture = (Math.sin(i * 1.18 + 0.9) + 1) / 2;
        return {
          height: 8 + envelope * 24 + texture * 9,
          opacity: 0.38 + envelope * 0.52,
        };
      }),
    [safeDuration],
  );

  useEffect(() => {
    setTrimProgressSec(0);
    lastProgressTickRef.current = null;
    didAutoPauseRef.current = false;
    shouldAutoPauseRef.current = false;
  }, [safeStart, currentDuration]);

  useEffect(() => {
    if (!isPlaying) {
      lastProgressTickRef.current = null;
      return;
    }

    if (trimProgressSec >= currentDuration - 0.02) {
      if (shouldAutoPauseRef.current) {
        shouldAutoPauseRef.current = false;
        didAutoPauseRef.current = true;
        onTogglePlay?.();
        return;
      }

      if (didAutoPauseRef.current) {
        setTrimProgressSec(0);
        didAutoPauseRef.current = false;
      }
    }
  }, [isPlaying, trimProgressSec, currentDuration, onTogglePlay]);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setTrimProgressSec((previous) => {
        const now = Date.now();
        const last = lastProgressTickRef.current ?? now;
        const delta = (now - last) / 1000;
        lastProgressTickRef.current = now;
        const next = previous + delta;

        if (next >= currentDuration) {
          shouldAutoPauseRef.current = true;
          return currentDuration;
        }
        return next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isPlaying, currentDuration, onTogglePlay]);

  return (
    <View style={styles.wrapper}>
      <Modal
        visible={isDurationPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsDurationPickerVisible(false)}
      >
        <View style={styles.durationModalRoot}>
          <Pressable
            style={styles.durationModalBackdrop}
            onPress={() => setIsDurationPickerVisible(false)}
            accessibilityLabel="Close clip duration picker"
            accessibilityRole="button"
          />
          <View style={styles.durationModalSheet}>
            <Text style={styles.durationModalTitle}>Choose Clip Duration</Text>
            <View style={styles.durationWheel}>
              <Picker
                selectedValue={durationDraftSec}
                onValueChange={(value) => setDurationDraftSec(Number(value))}
                style={styles.durationPicker}
                itemStyle={styles.durationPickerItem}
                accessibilityLabel="Clip duration picker"
              >
                {durationPickerOptions.map((option) => {
                  return (
                    <Picker.Item
                      key={`duration-${option}`}
                      label={`${option} Seconds`}
                      value={option}
                      color={colors.dark.text}
                    />
                  );
                })}
              </Picker>
            </View>
            <Pressable
              onPress={applyDurationDraft}
              style={({ pressed }) => [
                styles.durationModalDone,
                pressed && styles.durationModalDonePressed,
              ]}
              accessibilityLabel="Apply clip duration"
              accessibilityRole="button"
            >
              <Text style={styles.durationModalDoneText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <View style={styles.transportRow}>
        <Pressable
          onPress={openDurationPicker}
          style={({ pressed }) => [
            styles.lengthButton,
            pressed && styles.circleButtonPressed,
          ]}
          accessibilityLabel={`Selected length ${toWholeSecondLabel(currentDuration)} seconds. Tap to open duration picker.`}
          accessibilityRole="button"
        >
          <Text style={styles.lengthText}>{toWholeSecondLabel(currentDuration)}</Text>
        </Pressable>

        <Pressable
          onPress={handleRailPress}
          style={styles.scrubRailWrap}
          onLayout={onRailLayout}
          accessibilityLabel="Select where clip starts in song"
          accessibilityRole="adjustable"
        >
          <View style={styles.scrubRailLine} />
          <View
            {...railThumbPan.panHandlers}
            style={[
              styles.scrubRailThumb,
              {
                left: clamp(railThumbLeft, 0, Math.max(railWidth - 14, 0)),
              },
            ]}
          />
        </Pressable>

        <Pressable
          onPress={onTogglePlay}
          style={({ pressed }) => [
            styles.transportButton,
            pressed && styles.circleButtonPressed,
          ]}
          accessibilityLabel={isPlaying ? "Pause preview" : "Play preview"}
          accessibilityRole="button"
        >
          <Ionicons name={isPlaying ? "stop" : "play"} size={14} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{formatTime(safeStart)}</Text>
        <Text style={styles.durationText}>{formatTime(currentDuration)}</Text>
        <Text style={styles.timeText}>{formatTime(safeEnd)}</Text>
      </View>

      <View
        style={styles.track}
        onLayout={onTrackLayout}
        {...selectionWindowPan.panHandlers}
      >
        <View style={styles.frameStrip}>
          <View
            style={[
              styles.frameStripContent,
              {
                width: waveformContentWidth,
                paddingLeft: waveformLeadingInset,
                paddingRight: waveformTrailingInset,
                transform: [{ translateX: waveformTranslateX }],
              },
            ]}
            pointerEvents="none"
          >
            {waveformBars.map((bar, i) => (
              <View
                key={`bg-${i}`}
                style={[
                  styles.waveBar,
                  {
                    opacity: bar.opacity,
                    height: bar.height,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {trackLayoutReady && (
          <>
            {centeredSelectionLeft > 0 && (
              <View style={[styles.inactive, { left: 0, width: centeredSelectionLeft }]} />
            )}

            <View
              style={[
                styles.selectionWindow,
                {
                  left: centeredSelectionLeft,
                  width: selectionWidth,
                },
              ]}
            >
              <View style={styles.selectionInner}>
                <View
                  style={[
                    styles.selectionProgressFill,
                    { width: selectionProgressWidth },
                  ]}
                />
                <View
                  style={[
                    styles.selectionProgressHead,
                    { left: selectionProgressHeadLeft },
                  ]}
                />
              </View>
            </View>

            {centeredSelectionRight > 0 && (
              <View
                style={[
                  styles.inactive,
                  {
                    left: centeredSelectionLeft + selectionWidth,
                    width: centeredSelectionRight,
                  },
                ]}
              />
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  durationModalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  durationModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  durationModalSheet: {
    backgroundColor: "#020A15",
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  durationModalTitle: {
    ...typography.body,
    color: colors.dark.text,
    fontWeight: "700",
    textAlign: "center",
  },
  durationWheel: {
    position: "relative",
    height: DURATION_WHEEL_HEIGHT,
    borderRadius: radius.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    backgroundColor: "#030B17",
  },
  durationPicker: {
    height: DURATION_WHEEL_HEIGHT,
    color: colors.dark.text,
  },
  durationPickerItem: {
    color: colors.dark.text,
    fontSize: 22,
    fontWeight: "600",
  },
  durationModalDone: {
    alignSelf: "center",
    minWidth: 96,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  durationModalDonePressed: {
    opacity: 0.8,
  },
  durationModalDoneText: {
    ...typography.button,
    color: "#0A84FF",
    fontSize: 20,
    fontWeight: "700",
  },
  transportRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  lengthButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
    backgroundColor: "#0F1017",
    alignItems: "center",
    justifyContent: "center",
  },
  lengthText: {
    ...typography.caption,
    color: "#FFFFFF",
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  scrubRailWrap: {
    flex: 1,
    height: 34,
    justifyContent: "center",
  },
  scrubRailLine: {
    height: 2,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.35)",
    marginHorizontal: 7,
  },
  scrubRailThumb: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#F5C812",
    borderWidth: 2,
    borderColor: "#10121A",
    marginLeft: -7,
  },
  transportButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#151821",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  circleButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xs,
  },
  timeText: {
    ...typography.caption,
    color: colors.dark.textSecondary,
    fontVariant: ["tabular-nums"],
  },
  durationText: {
    ...typography.caption,
    color: "#7F82FF",
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  track: {
    height: 62,
    backgroundColor: "#090B12",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    position: "relative",
  },
  frameStrip: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  frameStripContent: {
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 5,
    paddingVertical: 8,
  },
  waveBar: {
    width: 2.2,
    borderRadius: radius.full,
    backgroundColor: "rgba(235,239,255,0.9)",
  },
  inactive: {
    position: "absolute",
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.62)",
  },
  selectionWindow: {
    position: "absolute",
    top: 6,
    bottom: 6,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.92)",
    borderRadius: radius.sm,
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 3,
  },
  selectionInner: {
    flex: 1,
    borderRadius: radius.sm,
    backgroundColor: "rgba(255,255,255,0.5)",
    overflow: "hidden",
  },
  selectionProgressFill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(102,116,255,0.45)",
  },
  selectionProgressHead: {
    position: "absolute",
    top: 1,
    bottom: 1,
    width: 2,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.98)",
  },
});
