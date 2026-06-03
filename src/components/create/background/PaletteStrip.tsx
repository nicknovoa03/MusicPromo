import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { clamp, hueDistance } from "@/lib/colorUtils";
import {
  CUSTOM_LIGHTNESS_MAX,
  CUSTOM_LIGHTNESS_MIN,
  PALETTE_SECTIONS,
} from "./paletteData";
import { backgroundControlStyles as styles } from "./backgroundStyles";
import type { PaletteSwatch } from "./types";

export type { PaletteSwatch };

type PaletteStripProps = {
  hue: number;
  saturation: number;
  lightness: number;
  disabled?: boolean;
  onSelect: (swatch: PaletteSwatch) => void;
};

export function PaletteStrip({
  hue,
  saturation,
  lightness,
  disabled = false,
  onSelect,
}: PaletteStripProps) {
  const normalizedHue = ((hue % 360) + 360) % 360;
  const [paletteViewportWidth, setPaletteViewportWidth] = useState(0);
  const [paletteScrollX, setPaletteScrollX] = useState(0);
  const [sectionLayouts, setSectionLayouts] = useState<
    Record<string, { x: number; width: number }>
  >({});
  const selectedGrayscaleSwatchId = useMemo(() => {
    if (saturation > 8) return null;
    const grayscaleSection = PALETTE_SECTIONS.find((section) => section.id === "gray");
    if (!grayscaleSection) return null;

    const closest = grayscaleSection.swatches.reduce(
      (best, swatch) => {
        const swatchLightness = clamp(
          swatch.l,
          CUSTOM_LIGHTNESS_MIN,
          CUSTOM_LIGHTNESS_MAX,
        );
        const distance = Math.abs(lightness - swatchLightness);
        if (!best || distance < best.distance) {
          return { id: swatch.id, distance };
        }
        return best;
      },
      null as { id: string; distance: number } | null,
    );
    return closest?.id ?? null;
  }, [lightness, saturation]);

  const isSelected = useCallback(
    (swatch: PaletteSwatch) => {
      if (swatch.s <= 2) {
        return saturation <= 8 && swatch.id === selectedGrayscaleSwatchId;
      }
      return (
        hueDistance(normalizedHue, swatch.h) <= 10 &&
        Math.abs(saturation - swatch.s) <= 16
      );
    },
    [normalizedHue, saturation, selectedGrayscaleSwatchId],
  );

  const activePalettePageIndex = useMemo(() => {
    if (paletteViewportWidth <= 0) return 0;
    const viewportCenter = paletteScrollX + paletteViewportWidth / 2;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    PALETTE_SECTIONS.forEach((section, index) => {
      const layout = sectionLayouts[section.id];
      if (!layout) return;
      const sectionCenter = layout.x + layout.width / 2;
      const distance = Math.abs(sectionCenter - viewportCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    return closestIndex;
  }, [paletteScrollX, paletteViewportWidth, sectionLayouts]);

  return (
    <View style={styles.paletteStripWrap}>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.paletteStripRow}
        style={styles.paletteStripScroll}
        onLayout={(event) => {
          setPaletteViewportWidth(event.nativeEvent.layout.width);
        }}
        onScroll={(event) => {
          setPaletteScrollX(event.nativeEvent.contentOffset.x);
        }}
        scrollEventThrottle={16}
      >
        {PALETTE_SECTIONS.map((section, sectionIndex) => (
          <View
            key={section.id}
            style={styles.paletteSection}
            onLayout={(event) => {
              const { x, width } = event.nativeEvent.layout;
              setSectionLayouts((previous) => {
                const existing = previous[section.id];
                if (
                  existing &&
                  Math.abs(existing.x - x) < 1 &&
                  Math.abs(existing.width - width) < 1
                ) {
                  return previous;
                }
                return { ...previous, [section.id]: { x, width } };
              });
            }}
          >
            <Text style={styles.paletteSectionLabel}>{section.label}</Text>
            <View style={styles.paletteSectionSwatches}>
              {section.swatches.map((swatch) => {
                const selected = isSelected(swatch);
                return (
                  <Pressable
                    key={swatch.id}
                    onPress={() => onSelect(swatch)}
                    disabled={disabled}
                    style={[
                      styles.paletteDotWrap,
                      selected && styles.paletteDotWrapSelected,
                      disabled && styles.paletteDotWrapDisabled,
                      { backgroundColor: swatch.hex },
                    ]}
                    accessibilityLabel={`${section.label} ${swatch.label}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected, disabled }}
                  />
                );
              })}
            </View>
            {sectionIndex < PALETTE_SECTIONS.length - 1 ? (
              <View style={styles.paletteSectionDivider} />
            ) : null}
          </View>
        ))}
      </ScrollView>
      <View style={styles.palettePager}>
        {PALETTE_SECTIONS.map((section, index) => {
          const isActive = index === activePalettePageIndex;
          return (
            <View
              key={`pager-${section.id}`}
              style={[
                styles.palettePagerDot,
                isActive && styles.palettePagerDotActive,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}
