import { type ComponentProps, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { colors, radius, spacing } from "@/constants/tokens";

export interface TemplateSwitcherOption {
  id: string;
  name: string;
}

interface TemplateSwitcherProps {
  options: TemplateSwitcherOption[];
  value: string;
  onChange: (value: string) => void;
}

type RailPresetId = "tight" | "balanced" | "spotlight";

interface RailPreset {
  itemWidth: number;
  itemGap: number;
  sideOpacity: number;
  minScale: number;
  railPaddingVertical: number;
  tileSize: number;
  iconSize: number;
}

const RAIL_PRESETS: Record<RailPresetId, RailPreset> = {
  tight: {
    itemWidth: 96,
    itemGap: 10,
    sideOpacity: 0.84,
    minScale: 0.97,
    railPaddingVertical: 4,
    tileSize: 76,
    iconSize: 28,
  },
  balanced: {
    itemWidth: 104,
    itemGap: 12,
    sideOpacity: 0.82,
    minScale: 0.95,
    railPaddingVertical: 6,
    tileSize: 84,
    iconSize: 30,
  },
  spotlight: {
    itemWidth: 112,
    itemGap: 14,
    sideOpacity: 0.78,
    minScale: 0.93,
    railPaddingVertical: 8,
    tileSize: 92,
    iconSize: 32,
  },
};

// Switch between "tight" | "balanced" | "spotlight" for feel tuning.
const ACTIVE_RAIL_PRESET: RailPresetId = "balanced";

const TEMPLATE_ICONS: Record<string, ComponentProps<typeof Ionicons>["name"]> = {
  "simple-spin": "disc",
  "graphic-pop": "color-palette",
};

function clampIndex(index: number, maxIndex: number): number {
  if (maxIndex <= 0) return 0;
  return Math.max(0, Math.min(index, maxIndex));
}

export function TemplateSwitcher({
  options,
  value,
  onChange,
}: TemplateSwitcherProps) {
  const preset = RAIL_PRESETS[ACTIVE_RAIL_PRESET];
  const snapInterval = preset.itemWidth + preset.itemGap;
  const railRef = useRef<FlatList<TemplateSwitcherOption>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const lastHapticTemplateIdRef = useRef<string | null>(value);
  const isUserDraggingRef = useRef(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [didInitialAlign, setDidInitialAlign] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState(value);

  const selectedIndex = useMemo(() => {
    if (!options.length) return 0;
    const nextIndex = options.findIndex((option) => option.id === value);
    return nextIndex >= 0 ? nextIndex : 0;
  }, [options, value]);
  const activeOption = useMemo(
    () => options.find((option) => option.id === activeTemplateId) ?? options[0],
    [activeTemplateId, options],
  );

  const sideInset = Math.max((containerWidth - preset.itemWidth) / 2, spacing.md);

  const scrollToIndex = useCallback(
    (index: number, animated: boolean) => {
      if (!options.length) return;
      const clamped = clampIndex(index, options.length - 1);
      railRef.current?.scrollToOffset({
        offset: clamped * snapInterval,
        animated,
      });
    },
    [options.length, snapInterval],
  );

  useEffect(() => {
    if (!options.length || containerWidth <= 0) return;
    scrollToIndex(selectedIndex, didInitialAlign);
    if (!didInitialAlign) {
      setDidInitialAlign(true);
    }
  }, [containerWidth, didInitialAlign, options.length, scrollToIndex, selectedIndex]);

  useEffect(() => {
    lastHapticTemplateIdRef.current = value;
  }, [value]);

  useEffect(() => {
    setActiveTemplateId(value);
  }, [value]);

  const triggerSelectionHaptic = useCallback((nextTemplateId: string) => {
    if (lastHapticTemplateIdRef.current === nextTemplateId) return;
    lastHapticTemplateIdRef.current = nextTemplateId;
    void (async () => {
      try {
        if (Platform.OS === "android") {
          await Haptics.performAndroidHapticsAsync(
            Haptics.AndroidHaptics.Segment_Tick,
          );
          return;
        }
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        void Haptics.selectionAsync().catch(() => undefined);
      }
    })();
  }, []);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  }, []);

  const selectIndex = useCallback(
    (
      index: number,
      behavior: { animated?: boolean; shouldScroll?: boolean } = {},
    ) => {
      const { animated = true, shouldScroll = true } = behavior;
      if (!options.length) return;
      const clamped = clampIndex(index, options.length - 1);
      const nextOption = options[clamped];
      if (!nextOption) return;

      if (nextOption.id !== activeTemplateId) {
        setActiveTemplateId(nextOption.id);
      }
      if (nextOption.id !== value) {
        triggerSelectionHaptic(nextOption.id);
        onChange(nextOption.id);
      }
      if (shouldScroll) {
        scrollToIndex(clamped, animated);
      }
    },
    [
      activeTemplateId,
      onChange,
      options,
      scrollToIndex,
      triggerSelectionHaptic,
      value,
    ],
  );

  const settleFromOffset = useCallback(
    (offsetX: number) => {
      if (!options.length) return;
      const nextIndex = clampIndex(
        Math.round(offsetX / snapInterval),
        options.length - 1,
      );
      selectIndex(nextIndex, { animated: false, shouldScroll: false });
    },
    [options.length, selectIndex, snapInterval],
  );

  const handleMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      settleFromOffset(event.nativeEvent.contentOffset.x);
    },
    [settleFromOffset],
  );

  const handleScrollBeginDrag = useCallback(() => {
    isUserDraggingRef.current = true;
  }, []);

  const handleScrollEndDrag = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!isUserDraggingRef.current) return;
      isUserDraggingRef.current = false;
      settleFromOffset(event.nativeEvent.contentOffset.x);
    },
    [settleFromOffset],
  );

  const renderItem = useCallback(
    ({
      item,
      index,
    }: {
      item: TemplateSwitcherOption;
      index: number;
    }) => {
      const inputRange = [
        (index - 1) * snapInterval,
        index * snapInterval,
        (index + 1) * snapInterval,
      ];
      const scale = scrollX.interpolate({
        inputRange,
        outputRange: [preset.minScale, 1, preset.minScale],
        extrapolate: "clamp",
      });
      const opacity = scrollX.interpolate({
        inputRange,
        outputRange: [preset.sideOpacity, 1, preset.sideOpacity],
        extrapolate: "clamp",
      });
      const selected = item.id === activeTemplateId;

      return (
        <Animated.View
          style={[
            styles.optionWrap,
            {
              width: preset.itemWidth,
              opacity,
              transform: [{ scale }],
            },
          ]}
        >
          <Pressable
            onPress={() => selectIndex(index)}
            style={({ pressed }) => [
              styles.option,
              {
                width: preset.tileSize,
                height: preset.tileSize,
              },
              selected && styles.optionSelected,
              pressed && styles.optionPressed,
            ]}
            accessibilityLabel={`Template ${item.name}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <Ionicons
              name={TEMPLATE_ICONS[item.id] ?? "shapes"}
              size={preset.iconSize}
              color={selected ? colors.dark.text : "rgba(255,255,255,0.9)"}
            />
          </Pressable>
        </Animated.View>
      );
    },
    [
      preset.iconSize,
      preset.itemWidth,
      preset.minScale,
      preset.tileSize,
      preset.sideOpacity,
      scrollX,
      selectIndex,
      snapInterval,
      activeTemplateId,
    ],
  );

  return (
    <View style={styles.root} onLayout={handleLayout}>
      <View
        style={[
          styles.railWrap,
          {
            paddingVertical: preset.railPaddingVertical,
          },
        ]}
      >
        <Animated.FlatList
          ref={railRef}
          data={options}
          keyExtractor={(item) => item.id}
          horizontal
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={[styles.separator, { width: preset.itemGap }]} />}
          contentContainerStyle={[
            styles.railContent,
            {
              paddingHorizontal: sideInset,
            },
          ]}
          showsHorizontalScrollIndicator={false}
          bounces={false}
          decelerationRate="fast"
          snapToInterval={snapInterval}
          disableIntervalMomentum
          onScrollBeginDrag={handleScrollBeginDrag}
          onScrollEndDrag={handleScrollEndDrag}
          onMomentumScrollEnd={handleMomentumEnd}
          scrollEventThrottle={16}
          removeClippedSubviews={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true },
          )}
          getItemLayout={(_, index) => ({
            length: snapInterval,
            offset: snapInterval * index,
            index,
          })}
        />
      </View>
      {activeOption ? (
        <View style={styles.activeLabelPill}>
          <Text style={styles.activeLabelText} numberOfLines={1}>
            {activeOption.name}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
    gap: spacing.xs,
  },
  railWrap: {
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  activeLabelPill: {
    alignSelf: "center",
    minHeight: 24,
    minWidth: 88,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 0,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  activeLabelText: {
    color: colors.dark.text,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  railContent: {
    alignItems: "center",
  },
  separator: {
    width: 0,
  },
  optionWrap: {
    alignItems: "center",
  },
  option: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 0,
    borderColor: "transparent",
  },
  optionSelected: {
    backgroundColor: colors.accent.primary,
    borderWidth: 1,
    borderColor: colors.accent.primary,
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
  },
  optionPressed: {
    opacity: 0.86,
  },
});
