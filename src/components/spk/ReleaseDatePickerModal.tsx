import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Modal,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typography, spacing, radius } from "@/constants/tokens";

const PICKER_HEIGHT = Platform.OS === "ios" ? 216 : 200;

const MONTH_LABELS = Array.from({ length: 12 }, (_, index) =>
  new Date(2000, index, 1).toLocaleDateString(undefined, { month: "short" }),
);

const YEAR_SPAN = 60;
const YEAR_START = new Date().getFullYear() - 30;

function daysInMonth(monthIndex: number, year: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function toPickerDate(value: Date | null) {
  const base = value ?? new Date();
  return {
    month: base.getMonth(),
    day: base.getDate(),
    year: base.getFullYear(),
  };
}

export type ReleaseDatePickerModalProps = {
  visible: boolean;
  value: Date | null;
  onConfirm: (date: Date) => void;
  onClear: () => void;
  onDismiss: () => void;
};

export function ReleaseDatePickerModal({
  visible,
  value,
  onConfirm,
  onClear,
  onDismiss,
}: ReleaseDatePickerModalProps) {
  const insets = useSafeAreaInsets();
  const [month, setMonth] = useState(0);
  const [day, setDay] = useState(1);
  const [year, setYear] = useState(YEAR_START);

  useEffect(() => {
    if (!visible) return;
    const next = toPickerDate(value);
    setMonth(next.month);
    setDay(next.day);
    setYear(next.year);
  }, [visible, value]);

  const years = useMemo(
    () => Array.from({ length: YEAR_SPAN }, (_, index) => YEAR_START + index),
    [],
  );

  const days = useMemo(() => {
    const count = daysInMonth(month, year);
    return Array.from({ length: count }, (_, index) => index + 1);
  }, [month, year]);

  useEffect(() => {
    if (day > days.length) {
      setDay(days.length);
    }
  }, [day, days.length]);

  const handleConfirm = useCallback(() => {
    onConfirm(new Date(year, month, day));
  }, [day, month, onConfirm, year]);

  const text = colors.dark.text;
  const secondary = colors.dark.textSecondary;
  const border = colors.dark.border;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay} pointerEvents="box-none">
        <Pressable
          style={styles.dismissArea}
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss date picker"
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.dark.background,
              paddingBottom: Math.max(insets.bottom, spacing.sm),
            },
          ]}
        >
          <View style={styles.handle} />
          <View style={[styles.header, { borderBottomColor: border }]}>
            <Pressable onPress={onClear} accessibilityRole="button" accessibilityLabel="Clear release date">
              <Text style={[styles.headerAction, { color: secondary }]}>Clear</Text>
            </Pressable>
            <Text style={[styles.headerTitle, { color: text }]}>Release Date</Text>
            <Pressable
              onPress={handleConfirm}
              accessibilityRole="button"
              accessibilityLabel="Confirm release date"
            >
              <Text style={[styles.headerAction, styles.headerActionDone, { color: text }]}>Done</Text>
            </Pressable>
          </View>

          <View style={[styles.pickerRow, { height: PICKER_HEIGHT }]}>
            <Picker
              selectedValue={month}
              onValueChange={(itemValue) => setMonth(Number(itemValue))}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              {MONTH_LABELS.map((label, index) => (
                <Picker.Item key={label} label={label} value={index} color={text} />
              ))}
            </Picker>
            <Picker
              selectedValue={day}
              onValueChange={(itemValue) => setDay(Number(itemValue))}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              {days.map((dayValue) => (
                <Picker.Item
                  key={dayValue}
                  label={String(dayValue)}
                  value={dayValue}
                  color={text}
                />
              ))}
            </Picker>
            <Picker
              selectedValue={year}
              onValueChange={(itemValue) => setYear(Number(itemValue))}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              {years.map((yearValue) => (
                <Picker.Item
                  key={yearValue}
                  label={String(yearValue)}
                  value={yearValue}
                  color={text}
                />
              ))}
            </Picker>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    zIndex: 10,
  },
  dismissArea: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dark.border,
    borderBottomWidth: 0,
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.22)",
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    ...typography.body,
    fontWeight: "600",
  },
  headerAction: {
    fontSize: 16,
    fontWeight: "500",
    minWidth: 52,
  },
  headerActionDone: {
    fontWeight: "600",
    textAlign: "right",
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
  },
  picker: {
    flex: 1,
    height: PICKER_HEIGHT,
    ...(Platform.OS === "android" ? { color: colors.dark.text } : null),
  },
  pickerItem: {
    color: colors.dark.text,
    fontSize: 18,
  },
});
