import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, spacing } from "@/constants/tokens";

export type FlyerEditorTab = "text" | "colors" | "photo" | "audio";

const TABS: { id: FlyerEditorTab; label: string }[] = [
  { id: "text", label: "Text" },
  { id: "colors", label: "Colors" },
  { id: "photo", label: "Photo" },
  { id: "audio", label: "Audio" },
];

type FlyerEditorTabsProps = {
  active: FlyerEditorTab;
  onChange: (tab: FlyerEditorTab) => void;
};

export function FlyerEditorTabs({ active, onChange }: FlyerEditorTabsProps) {
  return (
    <View style={styles.row}>
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Pressable
            key={tab.id}
            style={styles.tab}
            onPress={() => onChange(tab.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text
              style={[
                styles.label,
                isActive ? styles.labelActive : styles.labelInactive,
              ]}
            >
              {tab.label}
            </Text>
            {isActive ? <View style={styles.indicator} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.dark.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
  },
  labelActive: {
    color: colors.dark.text,
  },
  labelInactive: {
    color: colors.dark.textSecondary,
  },
  indicator: {
    position: "absolute",
    bottom: 0,
    left: "15%",
    right: "15%",
    height: 2,
    backgroundColor: colors.dark.text,
  },
});
