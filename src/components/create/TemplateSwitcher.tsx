import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, radius, spacing, typography } from "@/constants/tokens";

export interface TemplateSwitcherOption {
  id: string;
  name: string;
}

interface TemplateSwitcherProps {
  options: TemplateSwitcherOption[];
  value: string;
  onChange: (value: string) => void;
}

const ITEM_WIDTH = 132;
const ITEM_GAP = spacing.sm;
const SNAP_INTERVAL = ITEM_WIDTH + ITEM_GAP;

function clampIndex(index: number, maxIndex: number): number {
  if (maxIndex <= 0) return 0;
  return Math.max(0, Math.min(index, maxIndex));
}

export function TemplateSwitcher({
  options,
  value,
  onChange,
}: TemplateSwitcherProps) {
  const railRef = useRef<FlatList<TemplateSwitcherOption>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = useState(0);
  const [didInitialAlign, setDidInitialAlign] = useState(false);

  const selectedIndex = useMemo(() => {
    if (!options.length) return 0;
    const nextIndex = options.findIndex((option) => option.id === value);
    return nextIndex >= 0 ? nextIndex : 0;
  }, [options, value]);

  const selectedOption = options[selectedIndex] ?? options[0] ?? null;
  const sideInset = Math.max((containerWidth - ITEM_WIDTH) / 2, spacing.md);

  const scrollToIndex = useCallback(
    (index: number, animated: boolean) => {
      if (!options.length) return;
      const clamped = clampIndex(index, options.length - 1);
      railRef.current?.scrollToOffset({
        offset: clamped * SNAP_INTERVAL,
        animated,
      });
    },
    [options.length],
  );

  useEffect(() => {
    if (!options.length || containerWidth <= 0) return;
    scrollToIndex(selectedIndex, didInitialAlign);
    if (!didInitialAlign) {
      setDidInitialAlign(true);
    }
  }, [containerWidth, didInitialAlign, options.length, scrollToIndex, selectedIndex]);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  }, []);

  const selectIndex = useCallback(
    (index: number, animated = true) => {
      if (!options.length) return;
      const clamped = clampIndex(index, options.length - 1);
      const option = options[clamped];
      if (!option) return;
      if (option.id !== value) {
        onChange(option.id);
      }
      scrollToIndex(clamped, animated);
    },
    [onChange, options, scrollToIndex, value],
  );

  const handleMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!options.length) return;
      const offsetX = event.nativeEvent.contentOffset.x;
      const nextIndex = clampIndex(
        Math.round(offsetX / SNAP_INTERVAL),
        options.length - 1,
      );
      selectIndex(nextIndex, false);
    },
    [options.length, selectIndex],
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
        (index - 1) * SNAP_INTERVAL,
        index * SNAP_INTERVAL,
        (index + 1) * SNAP_INTERVAL,
      ];
      const scale = scrollX.interpolate({
        inputRange,
        outputRange: [0.92, 1, 0.92],
        extrapolate: "clamp",
      });
      const opacity = scrollX.interpolate({
        inputRange,
        outputRange: [0.55, 1, 0.55],
        extrapolate: "clamp",
      });
      const selected = item.id === value;

      return (
        <Animated.View
          style={[
            styles.optionWrap,
            {
              opacity,
              transform: [{ scale }],
            },
          ]}
        >
          <Pressable
            onPress={() => selectIndex(index)}
            style={({ pressed }) => [
              styles.option,
              selected && styles.optionSelected,
              pressed && styles.optionPressed,
            ]}
            accessibilityLabel={`Template ${item.name}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
              {item.name}
            </Text>
          </Pressable>
        </Animated.View>
      );
    },
    [scrollX, selectIndex, value],
  );

  return (
    <View style={styles.root} onLayout={handleLayout}>
      <View style={styles.railWrap}>
        <Animated.FlatList
          ref={railRef}
          data={options}
          keyExtractor={(item) => item.id}
          horizontal
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={[
            styles.railContent,
            {
              paddingHorizontal: sideInset,
            },
          ]}
          showsHorizontalScrollIndicator={false}
          bounces={false}
          decelerationRate="fast"
          snapToInterval={SNAP_INTERVAL}
          disableIntervalMomentum
          onMomentumScrollEnd={handleMomentumEnd}
          scrollEventThrottle={16}
          removeClippedSubviews={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true },
          )}
          getItemLayout={(_, index) => ({
            length: SNAP_INTERVAL,
            offset: SNAP_INTERVAL * index,
            index,
          })}
        />
      </View>
      <Text style={styles.activeName} numberOfLines={1}>
        {selectedOption?.name ?? "Template"}
      </Text>
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
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingVertical: 3,
  },
  railContent: {
    alignItems: "center",
  },
  separator: {
    width: ITEM_GAP,
  },
  optionWrap: {
    width: ITEM_WIDTH,
  },
  option: {
    minHeight: 38,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.dark.surface,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  optionSelected: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(255,255,255,0.94)",
  },
  optionPressed: {
    opacity: 0.82,
  },
  optionText: {
    ...typography.caption,
    color: "#D0D0D4",
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  optionTextSelected: {
    color: colors.dark.background,
    fontWeight: "700",
  },
  activeName: {
    ...typography.caption,
    color: colors.dark.textSecondary,
    textAlign: "center",
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});
