import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  Switch,
  ScrollView,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, spacing, radius } from "@/constants/tokens";
import type { FlyerLineup } from "@/lib/flyerDraft";
import {
  LINEUP_INTRO_PRESETS,
  MAX_LINEUP_ITEMS,
  moveLineupItem,
  normalizeLineup,
  setLineupHeadliner,
  clearLineupHeadliner,
  suggestLineupLayout,
} from "@/lib/flyerLineup";
import type { FlyerLineupLayout } from "@/lib/flyerDraft";

const LAYOUT_OPTIONS: { id: FlyerLineupLayout; label: string }[] = [
  { id: "grid", label: "Grid" },
  { id: "column", label: "Column" },
  { id: "festival", label: "Festival" },
  { id: "spotlight", label: "Spotlight" },
];

type FlyerLineupEditorProps = {
  lineup: FlyerLineup;
  onChange: (lineup: FlyerLineup) => void;
};

export function FlyerLineupEditor({ lineup, onChange }: FlyerLineupEditorProps) {
  const normalized = useMemo(() => normalizeLineup(lineup), [lineup]);
  const [introSheetVisible, setIntroSheetVisible] = useState(false);
  const [menuIndex, setMenuIndex] = useState<number | null>(null);

  const update = useCallback(
    (patch: Partial<FlyerLineup>) => {
      onChange(normalizeLineup({ ...normalized, ...patch }));
    },
    [normalized, onChange],
  );

  const updateItem = useCallback(
    (index: number, patch: Partial<FlyerLineup["items"][number]>) => {
      const items = normalized.items.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      );
      const next = normalizeLineup({
        ...normalized,
        items,
        layout:
          normalized.layout === "single"
            ? "single"
            : normalized.layout ?? suggestLineupLayout(items.length),
      });
      onChange(next);
    },
    [normalized, onChange],
  );

  const addPerformer = useCallback(() => {
    if (normalized.items.length >= MAX_LINEUP_ITEMS) return;
    onChange(
      normalizeLineup({
        ...normalized,
        items: [...normalized.items, { name: "", setTime: null }],
      }),
    );
  }, [normalized, onChange]);

  const removeItem = useCallback(
    (index: number) => {
      const items = normalized.items.filter((_, i) => i !== index);
      onChange(
        normalizeLineup({
          ...normalized,
          items,
          layout: suggestLineupLayout(items.length),
        }),
      );
      setMenuIndex(null);
    },
    [normalized, onChange],
  );

  return (
    <View style={styles.root}>
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Show set times</Text>
        <Switch
          value={normalized.showSetTimes}
          onValueChange={(showSetTimes) => update({ showSetTimes })}
        />
      </View>

      <Pressable
        style={styles.introButton}
        onPress={() => setIntroSheetVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Edit lineup intro label"
      >
        <Text style={styles.introButtonLabel}>Intro label</Text>
        <Text style={styles.introButtonValue} numberOfLines={1}>
          {normalized.introLabel || "None"}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.dark.textSecondary} />
      </Pressable>

      {normalized.items.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.layoutRail}>
          {LAYOUT_OPTIONS.map((opt) => {
            const active = normalized.layout === opt.id;
            return (
              <Pressable
                key={opt.id}
                style={[styles.layoutPill, active && styles.layoutPillActive]}
                onPress={() => update({ layout: opt.id })}
              >
                <Text style={[styles.layoutPillText, active && styles.layoutPillTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <View style={styles.list}>
        {normalized.items.map((item, index) => (
          <View key={`lineup-${index}`} style={styles.row}>
            <View style={styles.reorderCol}>
              <Pressable
                onPress={() =>
                  index > 0 && onChange(moveLineupItem(normalized, index, index - 1))
                }
                disabled={index === 0}
                accessibilityLabel="Move up"
              >
                <Ionicons
                  name="chevron-up"
                  size={18}
                  color={index === 0 ? colors.dark.border : colors.dark.textSecondary}
                />
              </Pressable>
              <Pressable
                onPress={() =>
                  index < normalized.items.length - 1 &&
                  onChange(moveLineupItem(normalized, index, index + 1))
                }
                disabled={index >= normalized.items.length - 1}
                accessibilityLabel="Move down"
              >
                <Ionicons
                  name="chevron-down"
                  size={18}
                  color={
                    index >= normalized.items.length - 1
                      ? colors.dark.border
                      : colors.dark.textSecondary
                  }
                />
              </Pressable>
            </View>
            <View style={styles.rowFields}>
              <TextInput
                style={styles.nameInput}
                value={item.name}
                onChangeText={(name) => updateItem(index, { name })}
                placeholder="Performer name"
                placeholderTextColor={colors.dark.textSecondary}
                autoCapitalize="characters"
              />
              {normalized.showSetTimes ? (
                <TextInput
                  style={styles.timeInput}
                  value={item.setTime ?? ""}
                  onChangeText={(setTime) => updateItem(index, { setTime })}
                  placeholder="9PM"
                  placeholderTextColor={colors.dark.textSecondary}
                  autoCapitalize="characters"
                />
              ) : null}
            </View>
            {item.headliner ? (
              <Ionicons name="star" size={16} color={colors.dark.text} />
            ) : null}
            <Pressable
              onPress={() => setMenuIndex(menuIndex === index ? null : index)}
              accessibilityLabel="Performer options"
            >
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.dark.textSecondary} />
            </Pressable>
            {menuIndex === index ? (
              <View style={styles.menu}>
                <Pressable
                  style={styles.menuItem}
                  onPress={() => {
                    onChange(setLineupHeadliner(normalized, index));
                    setMenuIndex(null);
                  }}
                >
                  <Text style={styles.menuText}>Set as headliner</Text>
                </Pressable>
                {item.headliner ? (
                  <Pressable
                    style={styles.menuItem}
                    onPress={() => {
                      onChange(clearLineupHeadliner(normalized));
                      setMenuIndex(null);
                    }}
                  >
                    <Text style={styles.menuText}>Remove headliner</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  style={styles.menuItem}
                  onPress={() => removeItem(index)}
                >
                  <Text style={[styles.menuText, styles.menuDanger]}>Remove</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ))}
      </View>

      {normalized.items.length < MAX_LINEUP_ITEMS ? (
        <Pressable
          style={styles.addRow}
          onPress={addPerformer}
          accessibilityRole="button"
          accessibilityLabel="Add performer"
        >
          <Ionicons name="add" size={20} color={colors.dark.textSecondary} />
          <Text style={styles.addText}>Add performer</Text>
        </Pressable>
      ) : null}

      <Modal visible={introSheetVisible} animationType="slide" transparent>
        <Pressable style={styles.sheetBackdrop} onPress={() => setIntroSheetVisible(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Intro label</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
              {LINEUP_INTRO_PRESETS.map((preset) => (
                <Pressable
                  key={preset}
                  style={styles.presetPill}
                  onPress={() => update({ introLabel: preset })}
                >
                  <Text style={styles.presetText}>{preset}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <TextInput
              style={styles.introInput}
              value={normalized.introLabel ?? ""}
              onChangeText={(introLabel) =>
                update({ introLabel: introLabel.trim() || null })
              }
              placeholder="Custom label"
              placeholderTextColor={colors.dark.textSecondary}
              autoCapitalize="characters"
            />
            <Pressable style={styles.clearIntro} onPress={() => update({ introLabel: null })}>
              <Text style={styles.clearIntroText}>Clear label</Text>
            </Pressable>
            <Pressable
              style={styles.sheetDone}
              onPress={() => setIntroSheetVisible(false)}
            >
              <Text style={styles.sheetDoneText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.dark.text,
  },
  introButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.border,
  },
  introButtonLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.dark.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  introButtonValue: {
    flex: 1,
    fontSize: 14,
    color: colors.dark.text,
    textAlign: "right",
  },
  layoutRail: { gap: spacing.sm, paddingVertical: spacing.xs },
  layoutPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dark.border,
  },
  layoutPillActive: {
    backgroundColor: colors.dark.text,
    borderColor: colors.dark.text,
  },
  layoutPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.dark.text,
  },
  layoutPillTextActive: { color: colors.dark.background },
  list: { gap: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    position: "relative",
  },
  reorderCol: { gap: 2 },
  rowFields: { flex: 1, gap: 6 },
  nameInput: {
    backgroundColor: colors.dark.surfaceMuted,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.dark.text,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dark.border,
  },
  timeInput: {
    backgroundColor: colors.dark.surfaceMuted,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.dark.text,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dark.border,
    maxWidth: 88,
  },
  menu: {
    position: "absolute",
    right: 0,
    top: 36,
    zIndex: 20,
    backgroundColor: colors.dark.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dark.border,
    minWidth: 160,
    overflow: "hidden",
  },
  menuItem: { paddingHorizontal: 14, paddingVertical: 12 },
  menuText: { fontSize: 14, color: colors.dark.text },
  menuDanger: { color: "#C62828" },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.dark.border,
  },
  addText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.dark.textSecondary,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.dark.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.dark.text,
  },
  presetRow: { gap: spacing.sm },
  presetPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.dark.surfaceMuted,
  },
  presetText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.dark.text,
  },
  introInput: {
    backgroundColor: colors.dark.surfaceMuted,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.dark.text,
  },
  clearIntro: { alignSelf: "flex-start" },
  clearIntroText: { fontSize: 14, color: colors.dark.textSecondary },
  sheetDone: {
    backgroundColor: colors.dark.text,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  sheetDoneText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.dark.background,
  },
});
