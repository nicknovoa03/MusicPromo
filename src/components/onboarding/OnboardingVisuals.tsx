import { useId } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Pattern, Rect, Stop } from "react-native-svg";
import { onboardingTheme as theme } from "@/constants/onboardingTheme";
import { radius, spacing } from "@/constants/tokens";

type StripeFillProps = {
  dark?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Handoff StripeFill — tactile placeholder, not flat grey blocks. */
export function StripeFill({ dark = false, style }: StripeFillProps) {
  const patternId = useId().replace(/:/g, "");
  const base = dark ? theme.stripeBaseDark : theme.stripeBaseLight;
  const alt = dark ? theme.stripeAltDark : theme.stripeAltLight;

  return (
    <View style={[StyleSheet.absoluteFillObject, { overflow: "hidden" }, style]}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFillObject}>
        <Defs>
          <Pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            width={14}
            height={14}
            patternTransform="rotate(-45)"
          >
            <Rect width={7} height={14} fill={base} />
            <Rect x={7} width={7} height={14} fill={alt} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </Svg>
    </View>
  );
}

type StepKickerProps = {
  children: string;
  centered?: boolean;
};

/** Quiet step label — sentence case, no tracked uppercase mono (Hallmark gate). */
export function StepKicker({ children, centered }: StepKickerProps) {
  return (
    <Text style={[styles.kicker, centered && styles.kickerCentered]}>{children}</Text>
  );
}

type ProgressSegmentsProps = {
  current: number;
  total: number;
};

export function ProgressSegments({ current, total }: ProgressSegmentsProps) {
  return (
    <View style={styles.progressRow} accessibilityRole="progressbar">
      {Array.from({ length: total }, (_, index) => {
        const filled = index < current;
        return (
          <View
            key={index}
            style={[styles.progressSegment, filled && styles.progressSegmentFilled]}
          />
        );
      })}
    </View>
  );
}

type FooterFadeProps = {
  height?: number;
};

export function FooterFade({ height = 28 }: FooterFadeProps) {
  const gradientId = useId().replace(/:/g, "");

  return (
    <View style={[styles.footerFade, { height }]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor={theme.bg} stopOpacity="1" />
            <Stop offset="0.72" stopColor={theme.bg} stopOpacity="1" />
            <Stop offset="1" stopColor={theme.bg} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
      </Svg>
    </View>
  );
}

type FlowStageProps = {
  index: number;
};

export function FlowStage({ index }: FlowStageProps) {
  return (
    <View style={styles.flowStage}>
      <Text style={styles.flowStageText}>{index}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.1,
    color: theme.textSecondary,
  },
  kickerCentered: {
    textAlign: "center",
  },
  progressRow: {
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    borderRadius: radius.full,
    backgroundColor: theme.border,
  },
  progressSegmentFilled: {
    backgroundColor: theme.text,
  },
  footerFade: {
    position: "absolute",
    left: 0,
    right: 0,
    top: -28,
  },
  flowStage: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  flowStageText: {
    fontSize: 13,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    color: theme.textSecondary,
  },
});
