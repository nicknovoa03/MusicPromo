import type { FlyerDraftInput, FlyerTemplateId } from "@/lib/flyerDraft";
import {
  buildFlyerTemplateData,
  resolveBackgroundGradient,
  FLYER_ACCENT_SWATCHES,
} from "@/lib/flyerTemplates";
import { HeatFlyerTemplate } from "./HeatFlyerTemplate";
import { IridescentFlyerTemplate } from "./IridescentFlyerTemplate";
import { VintageFlyerTemplate } from "./VintageFlyerTemplate";

type FlyerTemplateViewProps = {
  draft: FlyerDraftInput;
  templateId?: FlyerTemplateId;
  aspectRatio?: FlyerDraftInput["aspectRatio"];
  showWatermark?: boolean;
};

export function FlyerTemplateView({
  draft,
  templateId = draft.templateId ?? "heat",
  aspectRatio = draft.aspectRatio ?? "9:16",
  showWatermark = true,
}: FlyerTemplateViewProps) {
  const data = buildFlyerTemplateData(draft, undefined, templateId);
  const backgroundColors = resolveBackgroundGradient(
    templateId,
    draft.backgroundKey,
  );
  const accentColor = draft.accentColor ?? FLYER_ACCENT_SWATCHES[0]!;

  switch (templateId) {
    case "iridescent":
      return (
        <IridescentFlyerTemplate
          data={data}
          backgroundColors={backgroundColors}
          photoUri={draft.photoUri}
          aspectRatio={aspectRatio}
          showWatermark={showWatermark}
        />
      );
    case "vintage":
      return (
        <VintageFlyerTemplate
          data={data}
          backgroundColors={backgroundColors}
          photoUri={draft.photoUri}
          aspectRatio={aspectRatio}
          showWatermark={showWatermark}
        />
      );
    case "heat":
    default:
      return (
        <HeatFlyerTemplate
          data={data}
          backgroundColors={backgroundColors}
          accentColor={accentColor}
          photoUri={draft.photoUri}
          aspectRatio={aspectRatio}
          showWatermark={showWatermark}
        />
      );
  }
}
