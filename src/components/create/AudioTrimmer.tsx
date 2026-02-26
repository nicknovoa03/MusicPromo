import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  StyleSheet,
  PanResponder,
  Text,
  LayoutChangeEvent,
  GestureResponderEvent,
  PanResponderGestureState,
} from "react-native";
import { colors, spacing, radius, typography } from "@/constants/tokens";
import { TrimHandle } from "./TrimHandle";

interface AudioTrimmerProps {
  durationSec: number;
  startSec: number;
  endSec: number;
  onTrimChange: (start: number, end: number) => void;
  minDuration?: number;
  maxDuration?: number;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioTrimmer({
  durationSec,
  startSec,
  endSec,
  onTrimChange,
  minDuration = 15,
  maxDuration = 60,
}: AudioTrimmerProps) {
  const containerWidth = useRef(0);
  const [layoutReady, setLayoutReady] = useState(false);
  const latestTrimRef = useRef({ startSec, endSec });
  const gestureStartRef = useRef({ startSec, endSec });
  const onTrimChangeRef = useRef(onTrimChange);

  useEffect(() => {
    latestTrimRef.current = { startSec, endSec };
  }, [startSec, endSec]);

  useEffect(() => {
    onTrimChangeRef.current = onTrimChange;
  }, [onTrimChange]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    containerWidth.current = e.nativeEvent.layout.width;
    setLayoutReady(true);
  }, []);

  const secToX = (sec: number) =>
    containerWidth.current > 0 ? (sec / durationSec) * containerWidth.current : 0;

  const xToSec = (x: number) =>
    containerWidth.current > 0 ? (x / containerWidth.current) * durationSec : 0;

  const clampTrim = (
    newStart: number,
    newEnd: number,
    anchor: "start" | "end",
  ): [number, number] => {
    let s = Math.max(0, Math.min(newStart, durationSec));
    let e = Math.max(0, Math.min(newEnd, durationSec));
    let span = e - s;
    if (span < minDuration) {
      if (anchor === "start") {
        e = Math.min(s + minDuration, durationSec);
        s = e - minDuration;
      } else {
        s = Math.max(e - minDuration, 0);
        e = s + minDuration;
      }
    }
    span = e - s;
    if (span > maxDuration) {
      if (anchor === "start") {
        e = s + maxDuration;
      } else {
        s = e - maxDuration;
      }
    }
    return [Math.max(0, s), Math.min(durationSec, e)];
  };

  const createPanResponder = (anchor: "start" | "end") =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        gestureStartRef.current = {
          startSec: latestTrimRef.current.startSec,
          endSec: latestTrimRef.current.endSec,
        };
      },
      onPanResponderMove: (
        _: GestureResponderEvent,
        gs: PanResponderGestureState,
      ) => {
        const deltaSec = xToSec(gs.dx);
        const { startSec: baseStart, endSec: baseEnd } = gestureStartRef.current;
        if (anchor === "start") {
          const [ns, ne] = clampTrim(baseStart + deltaSec, baseEnd, "start");
          onTrimChangeRef.current(ns, ne);
        } else {
          const [ns, ne] = clampTrim(baseStart, baseEnd + deltaSec, "end");
          onTrimChangeRef.current(ns, ne);
        }
      },
    });

  const leftPan = useRef(createPanResponder("start")).current;
  const rightPan = useRef(createPanResponder("end")).current;

  const trimmedDuration = endSec - startSec;
  const leftOffset = secToX(startSec);
  const selectedWidth = secToX(endSec) - leftOffset;
  const waveHeights = useMemo(
    () =>
      Array.from(
        { length: 30 },
        (_, i) => 6 + Math.sin(i * 0.8) * 10 + Math.random() * 6,
      ),
    [durationSec],
  );

  return (
    <View style={styles.wrapper}>
      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{formatTime(startSec)}</Text>
        <Text style={styles.durationText}>{formatTime(trimmedDuration)}</Text>
        <Text style={styles.timeText}>{formatTime(endSec)}</Text>
      </View>

      <View style={styles.track} onLayout={onLayout}>
        {layoutReady && (
          <>
            {/* Inactive region before selection */}
            {leftOffset > 0 && (
              <View style={[styles.inactive, { left: 0, width: leftOffset }]} />
            )}

            {/* Selected region */}
            <View
              style={[
                styles.selected,
                { left: leftOffset, width: Math.max(selectedWidth, 32) },
              ]}
            >
              <View {...leftPan.panHandlers} style={styles.handleHitArea}>
                <TrimHandle side="left" />
              </View>

              <View style={styles.waveformPlaceholder}>
                {waveHeights.map((height, i) => (
                  <View
                    key={i}
                    style={[
                      styles.waveBar,
                      { height },
                    ]}
                  />
                ))}
              </View>

              <View {...rightPan.panHandlers} style={styles.handleHitArea}>
                <TrimHandle side="right" />
              </View>
            </View>

            {/* Inactive region after selection */}
            {secToX(durationSec) - secToX(endSec) > 0 && (
              <View
                style={[
                  styles.inactive,
                  {
                    left: secToX(endSec),
                    width: secToX(durationSec) - secToX(endSec),
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
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xs,
  },
  timeText: {
    ...typography.caption,
    color: colors.dark.textSecondary,
  },
  durationText: {
    ...typography.caption,
    color: colors.accent.primary,
    fontWeight: "600",
  },
  track: {
    height: 56,
    backgroundColor: colors.dark.surface,
    borderRadius: radius.sm,
    overflow: "hidden",
    position: "relative",
  },
  inactive: {
    position: "absolute",
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  selected: {
    position: "absolute",
    top: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.accent.primary,
    borderRadius: radius.sm,
  },
  handleHitArea: {
    width: 28,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  waveformPlaceholder: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingHorizontal: spacing.xs,
  },
  waveBar: {
    width: 2.5,
    borderRadius: 1.25,
    backgroundColor: colors.accent.primary,
    opacity: 0.5,
  },
});
