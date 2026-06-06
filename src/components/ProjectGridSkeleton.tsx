import { View, StyleSheet } from "react-native";
import { spacing, radius } from "@/constants/tokens";
import { Shimmer } from "@/components/Shimmer";

interface ProjectGridSkeletonProps {
  surfaceColor: string;
  shimmerColor: string;
  shimmerHighlightColor?: string;
  rowCount?: number;
}

function SkeletonCard({
  surfaceColor,
  shimmerColor,
  shimmerHighlightColor,
}: {
  surfaceColor: string;
  shimmerColor: string;
  shimmerHighlightColor?: string;
}) {
  return (
    <View style={[styles.card, { backgroundColor: surfaceColor }]}>
      <Shimmer
        style={styles.thumbnail}
        baseColor={shimmerColor}
        highlightColor={shimmerHighlightColor}
      />
      <View style={styles.body}>
        <Shimmer
          style={styles.titleLine}
          baseColor={shimmerColor}
          highlightColor={shimmerHighlightColor}
        />
        <Shimmer
          style={styles.dateLine}
          baseColor={shimmerColor}
          highlightColor={shimmerHighlightColor}
        />
      </View>
    </View>
  );
}

export function ProjectGridSkeleton({
  surfaceColor,
  shimmerColor,
  shimmerHighlightColor,
  rowCount = 3,
}: ProjectGridSkeletonProps) {
  return (
    <View style={styles.grid} accessibilityLabel="Loading projects">
      {Array.from({ length: rowCount }, (_, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          <SkeletonCard
            surfaceColor={surfaceColor}
            shimmerColor={shimmerColor}
            shimmerHighlightColor={shimmerHighlightColor}
          />
          <SkeletonCard
            surfaceColor={surfaceColor}
            shimmerColor={shimmerColor}
            shimmerHighlightColor={shimmerHighlightColor}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  card: {
    flex: 1,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  thumbnail: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 0,
  },
  body: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  titleLine: {
    height: 14,
    borderRadius: radius.sm,
    width: "72%",
  },
  dateLine: {
    height: 11,
    borderRadius: radius.sm,
    width: "48%",
  },
});
