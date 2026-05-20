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
import {
  from12HourParts,
  parseStoredTime,
  to12HourParts,
  toStoredTime,
} from "@/lib/flyerEventTime";

const PICKER_HEIGHT = Platform.OS === "ios" ? 216 : 200;

const HOURS_12 = Array.from({ length: 12 }, (_, index) => index + 1);
const MINUTES = Array.from({ length: 60 }, (_, index) => index);

export type EventTimePickerModalProps = {
  visible: boolean;
  value: string | null;
  title: string;
  allowClear?: boolean;
  onConfirm: (time: string) => void;
  onClear?: () => void;
  onDismiss: () => void;
};

function toPickerState(value: string | null) {
  const parsed = parseStoredTime(value ?? undefined);
  if (!parsed) {
    const now = new Date();
    const hour24 = now.getHours();
    const minute = now.getMinutes();
    const parts = to12HourParts({ hour24, minute });
    return { ...parts, isPm: parts.isPm };
  }
  return to12HourParts(parsed);
}

export function EventTimePickerModal({
  visible,
  value,
  title,
  allowClear = false,
  onConfirm,
  onClear,
  onDismiss,
}: EventTimePickerModalProps) {
  const insets = useSafeAreaInsets();
  const [hour12, setHour12] = useState(7);
  const [minute, setMinute] = useState(0);
  const [isPm, setIsPm] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const next = toPickerState(value);
    setHour12(next.hour12);
    setMinute(next.minute);
    setIsPm(next.isPm);
  }, [visible, value]);

  const periods = useMemo(() => ["AM", "PM"] as const, []);

  const handleConfirm = useCallback(() => {
    const parsed = from12HourParts(hour12, minute, isPm);
    onConfirm(toStoredTime(parsed.hour24, parsed.minute));
  }, [hour12, minute, isPm, onConfirm]);

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
          accessibilityLabel="Dismiss time picker"
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
            {allowClear && onClear ? (
              <Pressable
                onPress={onClear}
                accessibilityRole="button"
                accessibilityLabel="Clear time"
              >
                <Text style={[styles.headerAction, { color: secondary }]}>Clear</Text>
              </Pressable>
            ) : (
              <View style={styles.headerSpacer} />
            )}
            <Text style={[styles.headerTitle, { color: text }]}>{title}</Text>
            <Pressable
              onPress={handleConfirm}
              accessibilityRole="button"
              accessibilityLabel="Confirm time"
            >
              <Text style={[styles.headerAction, styles.headerActionDone, { color: text }]}>
                Done
              </Text>
            </Pressable>
          </View>

          <View style={[styles.pickerRow, { height: PICKER_HEIGHT }]}>
            <Picker
              selectedValue={hour12}
              onValueChange={(itemValue) => setHour12(Number(itemValue))}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              {HOURS_12.map((hour) => (
                <Picker.Item key={hour} label={String(hour)} value={hour} color={text} />
              ))}
            </Picker>
            <Picker
              selectedValue={minute}
              onValueChange={(itemValue) => setMinute(Number(itemValue))}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              {MINUTES.map((min) => (
                <Picker.Item
                  key={min}
                  label={String(min).padStart(2, "0")}
                  value={min}
                  color={text}
                />
              ))}
            </Picker>
            <Picker
              selectedValue={isPm ? "PM" : "AM"}
              onValueChange={(itemValue) => setIsPm(itemValue === "PM")}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              {periods.map((period) => (
                <Picker.Item key={period} label={period} value={period} color={text} />
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
  headerSpacer: {
    minWidth: 52,
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
