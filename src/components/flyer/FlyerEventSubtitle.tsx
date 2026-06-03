import { Text, StyleSheet } from "react-native";
import type { FlyerAspectRatio } from "@/lib/flyerDraft";
import { flyerSize, isFlyerCompact } from "@/lib/flyerLayout";

type FlyerEventSubtitleProps = {
  text?: string | null;
  color: string;
  aspectRatio?: FlyerAspectRatio;
};

export function FlyerEventSubtitle({
  text,
  color,
  aspectRatio = "9:16",
}: FlyerEventSubtitleProps) {
  const trimmed = text?.trim();
  if (!trimmed) return null;

  const compact = isFlyerCompact(aspectRatio);
  const fs = (value: number) => flyerSize(value, aspectRatio);

  return (
    <Text
      style={[
        styles.subtitle,
        {
          color,
          fontSize: fs(compact ? 11 : 13),
          marginTop: fs(compact ? 6 : 12),
        },
      ]}
    >
      {trimmed}
    </Text>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontWeight: "500",
    textAlign: "center",
  },
});
