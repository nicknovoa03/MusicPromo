export type SpinningCdAspectRatio = "9:16" | "1:1";

export interface SpinningCdTemplateLayout {
  isPortraitLayout: boolean;
  recordSize: number;
  recordRadius: number;
  labelRadius: number;
  holeRadius: number;
  recordX: number;
  recordY: number;
  armWidth: number;
  armHeight: number;
  armX: number;
  armY: number;
  armCapWidth: number;
  armCapHeight: number;
  armCapX: number;
  armCapY: number;
  armHeadWidth: number;
  armHeadHeight: number;
  armHeadX: number;
  armHeadY: number;
  armShadowX: number;
  armShadowY: number;
  armShadowWidth: number;
  armShadowHeight: number;
  haloTopWidth: number;
  haloTopHeight: number;
  haloTopX: number;
  haloTopY: number;
  haloBottomWidth: number;
  haloBottomHeight: number;
  haloBottomX: number;
  haloBottomY: number;
  bottomShadeWidth: number;
  bottomShadeHeight: number;
  bottomShadeX: number;
  bottomShadeY: number;
  haloTopRadiusX: number;
  haloTopRadiusY: number;
  haloBottomRadiusX: number;
  haloBottomRadiusY: number;
  bottomShadeRadiusX: number;
  bottomShadeRadiusY: number;
  arcTopSize: number;
  arcTopRadius: number;
  arcTopX: number;
  arcTopY: number;
  arcMidSize: number;
  arcMidRadius: number;
  arcMidX: number;
  arcMidY: number;
  arcBottomSize: number;
  arcBottomRadius: number;
  arcBottomX: number;
  arcBottomY: number;
  tonearmPivotSize: number;
  tonearmPivotRadius: number;
  tonearmPivotX: number;
  tonearmPivotY: number;
  textBlockX: number;
  textNowY: number;
  textTitleY: number;
  textPillY: number;
  textNowWidth: number;
  textTitleWidth: number;
  textNowHeight: number;
  textTitleHeight: number;
  textPillWidth: number;
  textPillHeight: number;
  controlsY: number;
  leftControlX: number;
  middleControlX: number;
  rightControlX: number;
  controlWidth: number;
  controlHeight: number;
  iconInset: number;
  iconBarWidth: number;
  iconBarHeight: number;
  fallbackRecordSize: number;
  fallbackRecordRadius: number;
  fallbackRecordX: number;
  fallbackRecordY: number;
  fallbackLabelRadius: number;
  fallbackHoleRadius: number;
}

export function getSpinningCdTemplateLayout(params: {
  width: number;
  height: number;
  aspectRatio: SpinningCdAspectRatio;
}): SpinningCdTemplateLayout {
  const { width, height, aspectRatio } = params;
  const isPortraitLayout = aspectRatio === "9:16";

  const recordSize = isPortraitLayout
    ? Math.round(width * 1.42)
    : Math.round(Math.min(width, height) * 1.18);
  const recordRadius = Math.round(recordSize / 2);
  const labelRadius = Math.round(recordRadius * 0.28);
  const holeRadius = Math.max(Math.round(recordRadius * 0.05), 6);
  const recordX = isPortraitLayout
    ? -Math.round(recordSize * 0.5)
    : Math.round((width - recordSize) / 2);
  const recordY = isPortraitLayout
    ? Math.round(height * 0.08)
    : Math.round((height - recordSize) / 2 - height * 0.07);

  const armWidth = Math.max(Math.round(width * 0.024), 12);
  const armHeight = isPortraitLayout
    ? Math.round(height * 0.31)
    : Math.round(recordSize * 0.46);
  const armX = isPortraitLayout ? Math.round(width * 0.86) : Math.round(width * 0.77);
  const armY = isPortraitLayout ? Math.round(height * 0.12) : Math.round(height * 0.24);
  const armCapWidth = Math.round(armWidth * 2.8);
  const armCapHeight = Math.max(Math.round(width * 0.025), 18);
  const armCapX = armX - Math.round((armCapWidth - armWidth) / 2);
  const armCapY = armY + armHeight - Math.round(armCapHeight * 0.6);
  const armHeadWidth = Math.round(armWidth * 3.6);
  const armHeadHeight = Math.max(Math.round(width * 0.055), 36);
  const armHeadX = armX - Math.round((armHeadWidth - armWidth) / 2);
  const armHeadY = armCapY + armCapHeight + Math.max(Math.round(width * 0.012), 8);
  const armShadowX = armX - Math.round(width * 0.01);
  const armShadowY = armY - Math.round(width * 0.03);
  const armShadowWidth = armHeadWidth + Math.round(width * 0.04);
  const armShadowHeight =
    armHeadY + armHeadHeight - armShadowY + Math.round(width * 0.015);

  const haloTopWidth = Math.round(width * 0.6);
  const haloTopHeight = Math.round(height * 0.24);
  const haloTopX = Math.round(width * 0.56);
  const haloTopY = -Math.round(height * 0.12);
  const haloBottomWidth = Math.round(width * 0.72);
  const haloBottomHeight = Math.round(height * 0.26);
  const haloBottomX = -Math.round(width * 0.1);
  const haloBottomY = Math.round(height * 0.82);
  const bottomShadeWidth = width + Math.round(width * 0.3);
  const bottomShadeHeight = Math.round(height * 0.32);
  const bottomShadeX = -Math.round((bottomShadeWidth - width) / 2);
  const bottomShadeY = height - Math.round(bottomShadeHeight * 0.58);
  const haloTopRadiusX = Math.max(Math.round(haloTopWidth / 2), 1);
  const haloTopRadiusY = Math.max(Math.round(haloTopHeight / 2), 1);
  const haloBottomRadiusX = Math.max(Math.round(haloBottomWidth / 2), 1);
  const haloBottomRadiusY = Math.max(Math.round(haloBottomHeight / 2), 1);
  const bottomShadeRadiusX = Math.max(Math.round(bottomShadeWidth / 2), 1);
  const bottomShadeRadiusY = Math.max(Math.round(bottomShadeHeight / 2), 1);

  const arcTopSize = Math.round(width * 0.52);
  const arcTopRadius = Math.max(Math.round(arcTopSize / 2), 1);
  const arcTopX = Math.round(width * 0.66);
  const arcTopY = Math.round(height * 0.03);
  const arcMidSize = Math.round(width * 0.94);
  const arcMidRadius = Math.max(Math.round(arcMidSize / 2), 1);
  const arcMidX = -Math.round(width * 0.35);
  const arcMidY = Math.round(height * 0.69);
  const arcBottomSize = Math.round(width * 0.9);
  const arcBottomRadius = Math.max(Math.round(arcBottomSize / 2), 1);
  const arcBottomX = Math.round(width * 0.48);
  const arcBottomY = Math.round(height * 0.72);

  const tonearmPivotSize = Math.round(width * 0.22);
  const tonearmPivotRadius = Math.max(Math.round(tonearmPivotSize / 2), 1);
  const tonearmPivotX = width - Math.round(width * 0.31);
  const tonearmPivotY = Math.round(height * 0.05);

  const textBlockX = Math.round(width * 0.06);
  const textNowY = Math.round(height * 0.61);
  const textTitleY = Math.round(height * 0.665);
  const textPillY = Math.round(height * 0.716);
  const textNowWidth = Math.round(width * 0.52);
  const textTitleWidth = Math.round(width * 0.6);
  const textNowHeight = Math.round(height * 0.031);
  const textTitleHeight = Math.round(height * 0.024);
  const textPillWidth = Math.round(width * 0.25);
  const textPillHeight = Math.round(height * 0.044);

  const controlsY = Math.round(height * 0.87);
  const leftControlX = Math.round(width * 0.06);
  const middleControlX = Math.round(width * 0.62);
  const rightControlX = Math.round(width * 0.79);
  const controlWidth = Math.round(width * 0.14);
  const controlHeight = Math.round(height * 0.044);
  const iconInset = Math.max(Math.round(controlHeight * 0.28), 2);
  const iconBarWidth = Math.max(Math.round(controlWidth * 0.06), 2);
  const iconBarHeight = Math.max(Math.round(controlHeight * 0.36), 6);

  const fallbackRecordSize = isPortraitLayout
    ? Math.round(width * 1.28)
    : Math.round(Math.min(width, height) * 1.02);
  const fallbackRecordRadius = Math.round(fallbackRecordSize / 2);
  const fallbackRecordX = isPortraitLayout
    ? -Math.round(fallbackRecordSize * 0.46)
    : Math.round((width - fallbackRecordSize) / 2);
  const fallbackRecordY =
    Math.round((height - fallbackRecordSize) / 2) -
    (isPortraitLayout ? Math.round(height * 0.11) : Math.round(height * 0.06));
  const fallbackLabelRadius = Math.round(fallbackRecordRadius * 0.28);
  const fallbackHoleRadius = Math.max(Math.round(fallbackRecordRadius * 0.05), 6);

  return {
    isPortraitLayout,
    recordSize,
    recordRadius,
    labelRadius,
    holeRadius,
    recordX,
    recordY,
    armWidth,
    armHeight,
    armX,
    armY,
    armCapWidth,
    armCapHeight,
    armCapX,
    armCapY,
    armHeadWidth,
    armHeadHeight,
    armHeadX,
    armHeadY,
    armShadowX,
    armShadowY,
    armShadowWidth,
    armShadowHeight,
    haloTopWidth,
    haloTopHeight,
    haloTopX,
    haloTopY,
    haloBottomWidth,
    haloBottomHeight,
    haloBottomX,
    haloBottomY,
    bottomShadeWidth,
    bottomShadeHeight,
    bottomShadeX,
    bottomShadeY,
    haloTopRadiusX,
    haloTopRadiusY,
    haloBottomRadiusX,
    haloBottomRadiusY,
    bottomShadeRadiusX,
    bottomShadeRadiusY,
    arcTopSize,
    arcTopRadius,
    arcTopX,
    arcTopY,
    arcMidSize,
    arcMidRadius,
    arcMidX,
    arcMidY,
    arcBottomSize,
    arcBottomRadius,
    arcBottomX,
    arcBottomY,
    tonearmPivotSize,
    tonearmPivotRadius,
    tonearmPivotX,
    tonearmPivotY,
    textBlockX,
    textNowY,
    textTitleY,
    textPillY,
    textNowWidth,
    textTitleWidth,
    textNowHeight,
    textTitleHeight,
    textPillWidth,
    textPillHeight,
    controlsY,
    leftControlX,
    middleControlX,
    rightControlX,
    controlWidth,
    controlHeight,
    iconInset,
    iconBarWidth,
    iconBarHeight,
    fallbackRecordSize,
    fallbackRecordRadius,
    fallbackRecordX,
    fallbackRecordY,
    fallbackLabelRadius,
    fallbackHoleRadius,
  };
}
