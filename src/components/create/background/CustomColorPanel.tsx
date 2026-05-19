import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { hslToHex } from "@/lib/colorUtils";
import {
  CUSTOM_TONE_LABELS,
  CUSTOM_TONE_OPTIONS,
} from "./paletteData";
import { PaletteStrip, type PaletteSwatch } from "./PaletteStrip";
import { backgroundControlStyles as styles } from "./backgroundStyles";

type CustomColorPanelProps = {
  hue: number;
  saturation: number;
  lightness: number;
  enabled: boolean;
  showToneOptions?: boolean;
  onPaletteSelect: (swatch: PaletteSwatch) => void;
  onToneSelect: (tone: number) => void;
};

export function CustomColorPanel({
  hue,
  saturation,
  lightness,
  enabled,
  showToneOptions = true,
  onPaletteSelect,
  onToneSelect,
}: CustomColorPanelProps) {
  const customColor = useMemo(
    () => hslToHex(hue, saturation, lightness),
    [hue, saturation, lightness],
  );

  return (
    <View style={styles.customColorCard}>
      <View style={styles.customColorHeader}>
        <Text style={styles.customColorTitle}>Custom Color</Text>
        <View style={[styles.customColorSwatch, { backgroundColor: customColor }]} />
      </View>

      <View style={styles.customHueHeader}>
        <Text style={styles.customHueLabel}>Palette</Text>
      </View>
      <PaletteStrip
        hue={hue}
        saturation={saturation}
        lightness={lightness}
        disabled={!enabled}
        onSelect={onPaletteSelect}
      />

      {showToneOptions ? (
        <>
          <View style={styles.customHueHeader}>
            <Text style={styles.customHueLabel}>Tone</Text>
          </View>
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.customToneRow}
          >
            {CUSTOM_TONE_OPTIONS.map((tone, toneIndex) => {
              const selected = tone === lightness;
              const toneColor = hslToHex(hue, saturation, tone);
              const toneLabel = CUSTOM_TONE_LABELS[toneIndex] ?? "Tone";
              return (
                <Pressable
                  key={`tone-${tone}`}
                  onPress={() => onToneSelect(tone)}
                  style={[
                    styles.customToneSwatchWrap,
                    selected && styles.customToneSwatchWrapSelected,
                    { backgroundColor: toneColor },
                  ]}
                  accessibilityLabel={`Color tone ${toneLabel}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                />
              );
            })}
          </ScrollView>
        </>
      ) : null}
    </View>
  );
}

export { parseCustomColorFromHex } from "./paletteData";
