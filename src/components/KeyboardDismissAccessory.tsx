import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, spacing, typography } from "@/constants/tokens";

export const KEYBOARD_DISMISS_ACCESSORY_ID = "keyboardDismiss";

type KeyboardDismissAccessoryProps = {
  nativeID?: string;
  onDismiss?: () => void;
};

/** iOS toolbar above the keyboard — required for number-pad fields that have no Return key. */
export function KeyboardDismissAccessory({
  nativeID = KEYBOARD_DISMISS_ACCESSORY_ID,
  onDismiss,
}: KeyboardDismissAccessoryProps) {
  if (Platform.OS !== "ios") return null;

  const handleDismiss = () => {
    Keyboard.dismiss();
    onDismiss?.();
  };

  return (
    <InputAccessoryView nativeID={nativeID}>
      <View style={styles.bar}>
        <Pressable
          onPress={handleDismiss}
          hitSlop={12}
          style={({ pressed }) => [styles.doneHitArea, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Dismiss keyboard"
        >
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    minHeight: 44,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.dark.surfaceMuted,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.dark.border,
  },
  doneHitArea: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  doneText: {
    ...typography.body,
    fontWeight: "600",
    color: colors.dark.text,
  },
  pressed: {
    opacity: 0.65,
  },
});
