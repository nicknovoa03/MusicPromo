import { View, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { SpinningCdTemplatePreview } from "@/components/create/SpinningCdTemplatePreview";
import type { RenderAspectRatio } from "@/lib/rendering/types";
import {
  isSpinningCdTemplate,
  SPINNING_CD_TEMPLATE_ID,
} from "@/lib/rendering/templates/spinningCdComposition";

interface TemplatePreviewProps {
  templateId?: string;
  photoUri?: string;
  aspectRatio: RenderAspectRatio;
  style?: StyleProp<ViewStyle>;
  showLabel?: boolean;
}

export function TemplatePreview({
  templateId,
  photoUri,
  aspectRatio,
  style,
  showLabel,
}: TemplatePreviewProps) {
  const resolvedTemplateId = templateId?.trim() || SPINNING_CD_TEMPLATE_ID;

  if (isSpinningCdTemplate(resolvedTemplateId)) {
    return (
      <SpinningCdTemplatePreview
        photoUri={photoUri}
        aspectRatio={aspectRatio}
        style={style}
        showLabel={showLabel}
      />
    );
  }

  return <View style={[styles.fallback, style]} />;
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: "#111111",
    borderRadius: 16,
  },
});
