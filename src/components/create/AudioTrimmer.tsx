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
import Ionicons from "@expo/vector-icons/Ionicons";
import { Picker } from "@react-native-picker/picker";
import * as Haptics from "expo-haptics";
import { colors, spacing, radius, typography } from "@/constants/tokens";
interface AudioTrimmerProps {
  durationSec: number;
  startSec: number;
  endSec: number;
  onTrimChange: (start: number, end: number) => void;
  centerTimeLabel?: string;
  isPlaying?: boolean;
  playbackProgressSec?: number;
  onTogglePlay?: () => void;
  minDuration?: number;
  maxDuration?: number;
  waveformData?: number[] | null;
}

const WAVEFORM_BAR_COUNT = 60;
const WAVEFORM_VISIBLE_SECONDS = 15;
const DURATION_WHEEL_HEIGHT = 190;
const START_DRAG_SENSITIVITY = 0.62;
const START_DRAG_DEADZONE_PX = 2;

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
  centerTimeLabel,
  isPlaying = false,
  playbackProgressSec,
  onTogglePlay,
  minDuration = 5,
  maxDuration = Number.POSITIVE_INFINITY,
  waveformData,
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
  const lastHapticSecRef = useRef<number | null>(null);

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
    selectionWidth: 0,
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
      selectionWidth: latestValuesRef.current.selectionWidth,
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
            railWidth: latestRailWidth,
            currentDuration: latestCurrentDuration,
            maxStart: latestMaxStart,
          } = latestValuesRef.current;
          if (latestRailWidth <= 0) return;
          if (Math.abs(gestureState.dx) < START_DRAG_DEADZONE_PX) return;

          const deltaSec =
            (gestureState.dx / latestRailWidth) *
            latestMaxStart *
            START_DRAG_SENSITIVITY;
          const nextStart = clamp(railGestureStartRef.current + deltaSec, 0, latestMaxStart);
          applyStart(nextStart, latestCurrentDuration);
        },
      }),
    [applyStart],
  );

  const selectionWidth = trackWidth > 0 ? trackWidth : Math.max(secToX(safeEnd) - secToX(safeStart), 96);
  // Keep selectionWidth in the ref so the gesture handler always has the latest value
  latestValuesRef.current.selectionWidth = selectionWidth;

  const centeredSelectionLeft = 0;
  const centeredSelectionRight = 0;
  const waveformLeadingInset = 0;
  const waveformTrailingInset = 0;

  const railProgress = maxStart > 0 ? safeStart / maxStart : 0;
  const waveformContentWidth = trackWidth;
  const waveformTranslateX = 0;
  const railThumbLeft = railWidth > 0 ? railProgress * railWidth : 0;
  const effectiveProgressRatio =
    currentDuration > 0 ? clamp(trimProgressSec / currentDuration, 0, 1) : 0;
  const effectiveSelectionProgressWidth = selectionWidth * effectiveProgressRatio;
  const effectiveSelectionProgressHeadLeft = clamp(
    effectiveSelectionProgressWidth - 1,
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
            currentDuration: latestCurrentDuration,
            maxStart: latestMaxStart,
            selectionWidth: latestSelectionWidth,
          } = latestValuesRef.current;

          if (latestSelectionWidth <= 0 || latestMaxStart <= 0) return;
          if (Math.abs(gestureState.dx) < START_DRAG_DEADZONE_PX) return;

          const deltaStart =
            (-gestureState.dx * latestCurrentDuration) / latestSelectionWidth;
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

  const waveformBars = useMemo(() => {
    if (waveformData && waveformData.length > 0) {
      return Array.from({ length: WAVEFORM_BAR_COUNT }, (_, i) => {
        const windowSec = safeStart + (i / WAVEFORM_BAR_COUNT) * currentDuration;
        const t = clamp(windowSec / safeDuration, 0, 1);
        const srcIdx = t * (waveformData.length - 1);
        const lo = Math.floor(srcIdx);
        const hi = Math.min(lo + 1, waveformData.length - 1);
        const frac = srcIdx - lo;
        const amp = waveformData[lo] * (1 - frac) + waveformData[hi] * frac;
        const curved = Math.pow(amp, 2.2);
        return {
          height: 10 + curved * 52,
          opacity: 0.2 + curved * 0.75,
        };
      });
    }
    return Array.from({ length: WAVEFORM_BAR_COUNT }, (_, i) => {
      const phase = safeStart * 0.13 + i * 0.34;
      const envelope = (Math.sin(phase) + 1) / 2;
      const texture = (Math.sin(i * 1.18 + 0.9) + 1) / 2;
      const curved = Math.pow(envelope, 2.2);
      return {
        height: 10 + curved * 44 + texture * 8,
        opacity: 0.2 + curved * 0.75,
      };
    });
  }, [waveformData, safeStart, safeDuration]);

  useEffect(() => {
    setTrimProgressSec(0);
    lastProgressTickRef.current = null;
    didAutoPauseRef.current = false;
    shouldAutoPauseRef.current = false;
  }, [safeStart, currentDuration]);

  useEffect(() => {
    const currentSec = Math.floor(safeStart);
    if (lastHapticSecRef.current === null) {
      lastHapticSecRef.current = currentSec;
      return;
    }
    if (currentSec !== lastHapticSecRef.current) {
      lastHapticSecRef.current = currentSec;
      void Haptics.selectionAsync().catch(() => undefined);
    }
  }, [safeStart]);

  // Sync internal position from audio callback to correct drift.
  useEffect(() => {
    if (typeof playbackProgressSec !== "number" || !Number.isFinite(playbackProgressSec)) return;
    const clamped = clamp(playbackProgressSec, 0, currentDuration);
    setTrimProgressSec(clamped);
    lastProgressTickRef.current = Date.now();
  }, [playbackProgressSec, currentDuration]);

  // Auto-pause logic (only used when no external position tracking).
  useEffect(() => {
    if (typeof playbackProgressSec === "number") return;
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
  }, [isPlaying, trimProgressSec, currentDuration, onTogglePlay, playbackProgressSec]);

  // 60fps timer — always runs while playing for smooth animation.
  // When external position is provided, the sync effect above corrects drift periodically.
  useEffect(() => {
    if (!isPlaying) {
      lastProgressTickRef.current = null;
      return;
    }

    const interval = setInterval(() => {
      setTrimProgressSec((previous) => {
        const now = Date.now();
        const last = lastProgressTickRef.current ?? (now - 16);
        const delta = (now - last) / 1000;
        lastProgressTickRef.current = now;
        const next = previous + delta;

        if (typeof playbackProgressSec !== "number" && next >= currentDuration) {
          shouldAutoPauseRef.current = true;
          return currentDuration;
        }
        return Math.min(next, currentDuration);
      });
    }, 16);

    return () => clearInterval(interval);
  }, [isPlaying, currentDuration, playbackProgressSec]);

  return (
    <View style={styles.wrapper}>
      <Modal
        visible={isDurationPickerVisible}
        transparent
        animationType="slide"
        presentationStyle="overFullScreen"
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
                style={[styles.durationPicker, { backgroundColor: "#111318" }]}
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
        <Text style={[styles.timeText, styles.timeTextStart]}>
          {formatTime(safeStart)}
        </Text>
        <Text style={styles.centerTimeText}>
          {centerTimeLabel ?? formatTime(currentDuration)}
        </Text>
        <Text style={[styles.timeText, styles.timeTextEnd]}>
          {formatTime(safeEnd)}
        </Text>
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
                    { width: effectiveSelectionProgressWidth },
                  ]}
                />
                {effectiveProgressRatio > 0 && (
                  <View
                    style={[
                      styles.selectionProgressHead,
                      { left: effectiveSelectionProgressHeadLeft },
                    ]}
                  />
                )}
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
    backgroundColor: "transparent",
  },
  durationModalSheet: {
    backgroundColor: "#111318",
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
    backgroundColor: "#111318",
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
    color: colors.accent.primary,
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
    backgroundColor: colors.accent.primary,
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
    alignItems: "center",
    paddingHorizontal: spacing.xs,
    gap: spacing.xs,
  },
  timeText: {
    ...typography.caption,
    color: colors.dark.textSecondary,
    fontVariant: ["tabular-nums"],
  },
  timeTextStart: {
    flex: 1,
    textAlign: "left",
  },
  timeTextEnd: {
    flex: 1,
    textAlign: "right",
  },
  centerTimeText: {
    ...typography.caption,
    color: colors.dark.textSecondary,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    textAlign: "center",
  },
  track: {
    height: 80,
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
    alignItems: "flex-end",
    paddingHorizontal: 0,
    paddingTop: 16,
    paddingBottom: 0,
  },
  waveBar: {
    flex: 1,
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
    top: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.92)",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  selectionInner: {
    flex: 1,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  selectionProgressFill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(255,255,255,0.25)",
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
