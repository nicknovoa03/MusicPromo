import { Pressable, type StyleProp, type ViewStyle } from "react-native";
import { backgroundControlStyles as styles } from "./backgroundStyles";

type BackgroundSwatchProps = {
  swatchColor: string;
  selected?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

export function BackgroundSwatch({
  swatchColor,
  selected = false,
  onPress,
  accessibilityLabel,
  style,
  children,
}: BackgroundSwatchProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.backgroundSwatchWrap,
        selected && styles.backgroundSwatchWrapSelected,
        { backgroundColor: swatchColor },
        children ? styles.backgroundSwatchWithChild : null,
        style,
      ]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      {children}
    </Pressable>
  );
}

