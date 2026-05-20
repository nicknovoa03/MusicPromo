import { View, Text, StyleSheet } from "react-native";
import type { FlyerLineup } from "@/lib/flyerDraft";
import {
  lineupToTemplateActs,
  normalizeLineup,
} from "@/lib/flyerLineup";
import { flyerFontFamilies } from "@/lib/flyerFonts";

type FlyerLineupBlockProps = {
  lineup: FlyerLineup;
  accentColor: string;
  textColor?: string;
  mutedColor?: string;
  templateId?: "heat" | "iridescent" | "vintage";
};

export function FlyerLineupBlock({
  lineup,
  accentColor,
  textColor = "#fff",
  mutedColor = "rgba(255,255,255,0.65)",
  templateId = "heat",
}: FlyerLineupBlockProps) {
  const normalized = normalizeLineup(lineup);
  const acts = lineupToTemplateActs(normalized);

  if (acts.length === 0) return null;

  const displayFont =
    templateId === "iridescent"
      ? flyerFontFamilies.displayCondensed
      : flyerFontFamilies.display;

  if (normalized.layout === "single" && acts[0]) {
    return (
      <View style={styles.singleWrap}>
        {normalized.introLabel ? (
          <Text style={[styles.introLabel, { color: mutedColor }]}>
            {normalized.introLabel}
          </Text>
        ) : null}
        <Text style={[styles.singleName, { color: textColor, fontFamily: displayFont }]}>
          {acts[0].name}
        </Text>
        {normalized.showSetTimes && acts[0].time ? (
          <Text style={[styles.singleTime, { color: accentColor }]}>{acts[0].time}</Text>
        ) : null}
      </View>
    );
  }

  const headliner = acts.find((a) => a.headliner);
  const supports = acts.filter((a) => !a.headliner);

  if (normalized.layout === "spotlight" && headliner) {
    return (
      <View style={styles.wrap}>
        {normalized.introLabel ? (
          <Text style={[styles.introLabel, { color: mutedColor }]}>
            {normalized.introLabel}
          </Text>
        ) : null}
        <View style={styles.headlinerRow}>
          {normalized.showSetTimes && headliner.time ? (
            <Text style={[styles.headlinerTime, { color: accentColor }]}>
              {headliner.time}
            </Text>
          ) : null}
          <Text
            style={[
              styles.headlinerName,
              { color: textColor, fontFamily: displayFont, fontSize: 32 },
            ]}
          >
            {headliner.name}
          </Text>
        </View>
        <View style={[styles.grid, { marginTop: 8 }]}>
          {supports.map((act, index) => (
            <View key={`${act.name}-${index}`} style={styles.gridCell}>
              {normalized.showSetTimes && act.time ? (
                <Text style={[styles.gridTime, { color: accentColor }]}>{act.time}</Text>
              ) : null}
              <Text style={[styles.gridName, { color: textColor, fontSize: 13 }]}>
                {act.name}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {normalized.introLabel ? (
        <Text style={[styles.introLabel, { color: mutedColor }]}>
          {normalized.introLabel}
        </Text>
      ) : null}

      {headliner ? (
        <View style={styles.headlinerRow}>
          {normalized.showSetTimes && headliner.time ? (
            <Text style={[styles.headlinerTime, { color: accentColor }]}>
              {headliner.time}
            </Text>
          ) : null}
          <Text
            style={[
              styles.headlinerName,
              { color: textColor, fontFamily: displayFont },
            ]}
          >
            {headliner.name}
          </Text>
        </View>
      ) : null}

      {normalized.layout === "festival" ? (
        <View style={styles.festival}>
          {(headliner ? supports : acts).map((act, index) => (
            <View
              key={`${act.name}-${index}`}
              style={[styles.festivalRow, index > 0 && styles.festivalBorder]}
            >
              <Text style={[styles.festivalName, { color: textColor }]}>{act.name}</Text>
              {normalized.showSetTimes && act.time ? (
                <Text style={[styles.festivalTime, { color: accentColor }]}>{act.time}</Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : normalized.layout === "column" ? (
        <View style={styles.column}>
          {(headliner ? supports : acts).map((act, index) => (
            <View key={`${act.name}-${index}`} style={styles.columnRow}>
              <Text style={[styles.columnName, { color: textColor }]}>{act.name}</Text>
              {normalized.showSetTimes && act.time ? (
                <Text style={[styles.columnTime, { color: accentColor }]}>{act.time}</Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.grid}>
          {(headliner ? supports : acts).map((act, index) => (
            <View key={`${act.name}-${index}`} style={styles.gridCell}>
              {normalized.showSetTimes && act.time ? (
                <Text style={[styles.gridTime, { color: accentColor }]}>{act.time}</Text>
              ) : null}
              <Text
                style={[
                  styles.gridName,
                  act.headliner && { fontFamily: displayFont, fontSize: 18 },
                  { color: textColor },
                ]}
              >
                {act.name}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    marginTop: 16,
  },
  introLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 10,
    textTransform: "uppercase",
  },
  singleWrap: {
    alignItems: "center",
    marginTop: 20,
    gap: 6,
  },
  singleName: {
    fontSize: 40,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  singleTime: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
  },
  headlinerRow: {
    alignItems: "center",
    marginBottom: 14,
    gap: 4,
  },
  headlinerTime: {
    fontSize: 11,
    fontWeight: "600",
  },
  headlinerName: {
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  gridCell: {
    width: "48%",
  },
  gridTime: {
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 2,
  },
  gridName: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  column: {
    gap: 8,
  },
  columnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  columnName: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  columnTime: {
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 8,
  },
  festival: {
    gap: 0,
  },
  festivalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  festivalBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.2)",
  },
  festivalName: {
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
  festivalTime: {
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 8,
  },
});
