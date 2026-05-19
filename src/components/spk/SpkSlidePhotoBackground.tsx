import type { ReactNode } from "react";
import { View, Image, StyleSheet, type ViewStyle, type StyleProp } from "react-native";

export interface SpkSlidePhotoBackgroundProps {
  width: number;
  height: number;
  imageUri?: string | null;
  fallbackColor: string;
  overlayOpacity?: number;
  padding?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/** Full-bleed photo background with dark overlay for readable slide text. */
export function SpkSlidePhotoBackground({
  width,
  height,
  imageUri,
  fallbackColor,
  overlayOpacity = 0.58,
  padding,
  style,
  children,
}: SpkSlidePhotoBackgroundProps) {
  const hasImage = Boolean(imageUri?.trim());

  return (
    <View
      style={[
        styles.container,
        { width, height, backgroundColor: fallbackColor, padding },
        style,
      ]}
    >
      {hasImage ? (
        <>
          <Image
            source={{ uri: imageUri! }}
            style={[StyleSheet.absoluteFill, styles.coverImage]}
            resizeMode="cover"
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: `rgba(0,0,0,${overlayOpacity})` },
            ]}
          />
        </>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  /** Slight overscan avoids a 1px uncovered edge in view-shot JPEG exports. */
  coverImage: {
    transform: [{ scale: 1.02 }],
  },
});
