import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "@/constants/tokens";

export interface TemplateToggleOption {
  id: string;
  label: string;
}

interface TemplateToggleProps {
  value: string;
  options: TemplateToggleOption[];
  onChange: (templateId: string) => void;
}

function isSimpleTemplate(templateId: string) {
  return templateId === "simple-spin";
}

export function TemplateToggle({ value, options, onChange }: TemplateToggleProps) {
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const active = option.id === value;
        const simple = isSimpleTemplate(option.id);
        return (
          <Pressable
            key={option.id}
            style={[styles.option, active && styles.optionActive]}
            onPress={() => onChange(option.id)}
            accessibilityLabel={`Template ${option.label}`}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
          >
            <View
              style={[
                styles.previewShell,
                simple ? styles.previewSimple : styles.previewDeck,
                active && styles.previewShellActive,
              ]}
            >
              <View
                style={[
                  styles.previewDisc,
                  simple ? styles.previewDiscSimple : styles.previewDiscDeck,
                ]}
              />
              {!simple ? <View style={styles.previewArm} /> : null}
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.dark.surface,
  },
  optionActive: {
    backgroundColor: colors.accent.primary,
  },
  previewShell: {
    width: 16,
    height: 16,
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  previewShellActive: {
    borderColor: colors.dark.text,
  },
  previewSimple: {
    backgroundColor: "#050507",
  },
  previewDeck: {
    backgroundColor: "#c4c6cc",
  },
  previewDisc: {
    borderRadius: 9999,
  },
  previewDiscSimple: {
    width: 11,
    height: 11,
    backgroundColor: "#16181c",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  previewDiscDeck: {
    width: 10,
    height: 10,
    backgroundColor: "#1a1b22",
  },
  previewArm: {
    position: "absolute",
    width: 1.5,
    height: 7,
    right: 2,
    top: 1,
    borderRadius: 9999,
    backgroundColor: "#111217",
    transform: [{ rotate: "18deg" }],
  },
  label: {
    ...typography.caption,
    color: colors.dark.textSecondary,
  },
  labelActive: {
    color: colors.dark.text,
    fontWeight: "600",
  },
});
