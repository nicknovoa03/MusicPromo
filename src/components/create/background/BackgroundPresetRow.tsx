import { ScrollView } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { BackgroundSwatch } from "./BackgroundSwatch";
import { backgroundControlStyles as styles } from "./backgroundStyles";
import type { BackgroundOption } from "./types";

type BackgroundPresetRowProps = {
  options: BackgroundOption[];
  selectedColor: string | null;
  isCustomColorEnabled: boolean;
  showCustomToggle?: boolean;
  colorAppliesWhenPhotoSelected?: boolean;
  innerUsesPhoto?: boolean;
  onSelectPreset: (color: string | null) => void;
  onToggleCustom?: () => void;
};

export function BackgroundPresetRow({
  options,
  selectedColor,
  isCustomColorEnabled,
  showCustomToggle = true,
  colorAppliesWhenPhotoSelected = false,
  innerUsesPhoto = false,
  onSelectPreset,
  onToggleCustom,
}: BackgroundPresetRowProps) {
  const colorSelectionActive = colorAppliesWhenPhotoSelected || !innerUsesPhoto;

  return (
    <ScrollView
      horizontal
      nestedScrollEnabled
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.backgroundRow}
    >
      {showCustomToggle ? (
        <BackgroundSwatch
          swatchColor="#ffffff"
          selected={isCustomColorEnabled}
          onPress={onToggleCustom ?? (() => {})}
          accessibilityLabel="Toggle custom background color"
          style={styles.customBackgroundToggleWrap}
        >
          <Ionicons name="color-palette" size={11} color="#000000" />
        </BackgroundSwatch>
      ) : null}
      {options.map((option) => {
        const selected =
          colorSelectionActive &&
          (showCustomToggle ? !isCustomColorEnabled : true) &&
          option.color === selectedColor;
        return (
          <BackgroundSwatch
            key={option.id}
            swatchColor={option.swatch}
            selected={selected}
            onPress={() => onSelectPreset(option.color)}
            accessibilityLabel={`Background ${option.label}`}
          />
        );
      })}
    </ScrollView>
  );
}
