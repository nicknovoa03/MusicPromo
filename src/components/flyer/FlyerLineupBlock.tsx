import { View, Text, StyleSheet, Platform } from "react-native";
import type { FlyerAspectRatio } from "@/lib/flyerDraft";
import type { FlyerLineup } from "@/lib/flyerDraft";
import {
  lineupToTemplateActs,
  normalizeLineup,
} from "@/lib/flyerLineup";
import { flyerSize, isFlyerCompact } from "@/lib/flyerLayout";
import { flyerFontFamilies } from "@/lib/flyerFonts";

type TemplateAct = ReturnType<typeof lineupToTemplateActs>[number];

function splitIntoGridColumns(acts: TemplateAct[]): [TemplateAct[], TemplateAct[]] {
  const left: TemplateAct[] = [];
  const right: TemplateAct[] = [];
  acts.forEach((act, index) => {
    (index % 2 === 0 ? left : right).push(act);
  });
  return [left, right];
}

type FlyerLineupBlockProps = {
  lineup: FlyerLineup;
  accentColor: string;
  textColor?: string;
  mutedColor?: string;
  templateId?: "heat" | "iridescent" | "vintage";
  aspectRatio?: FlyerAspectRatio;
};

export function FlyerLineupBlock({
  lineup,
  accentColor,
  textColor = "#fff",
  mutedColor = "rgba(255,255,255,0.65)",
  templateId = "heat",
  aspectRatio = "9:16",
}: FlyerLineupBlockProps) {
  const normalized = normalizeLineup(lineup);
  const acts = lineupToTemplateActs(normalized);
  const compact = isFlyerCompact(aspectRatio);
  const fs = (value: number) => flyerSize(value, aspectRatio);

  if (acts.length === 0) return null;

  const displayFont =
    templateId === "iridescent"
      ? flyerFontFamilies.displayCondensed
      : flyerFontFamilies.display;

  const wrapStyle = { marginTop: fs(compact ? 10 : 16) };

  const renderGridCell = (
    act: TemplateAct,
    index: number,
    nameSize: number,
    headlinerNameSize: number,
    align: "left" | "right" = "left",
  ) => (
    <View key={`${act.name}-${index}`} style={styles.gridCell}>
      {normalized.showSetTimes && act.time ? (
        <Text
          style={[
            styles.gridTime,
            {
              color: accentColor,
              fontSize: fs(10),
              marginBottom: fs(2),
              textAlign: align,
            },
          ]}
        >
          {act.time}
        </Text>
      ) : null}
      <Text
        style={[
          styles.gridName,
          {
            color: textColor,
            fontSize: nameSize,
            textAlign: align,
            ...(act.headliner
              ? { fontFamily: displayFont, fontSize: headlinerNameSize }
              : null),
          },
        ]}
      >
        {act.name}
      </Text>
    </View>
  );

  const renderArtistsPill = (pillActs: TemplateAct[]) => {
    if (pillActs.length === 0) return null;

    const count = pillActs.length;
    const dense = count >= 4;
    const pillFont =
      templateId === "iridescent" || dense
        ? flyerFontFamilies.displayCondensed
        : flyerFontFamilies.display;
    const nameSize =
      templateId === "iridescent"
        ? fs(compact ? (dense ? 18 : 17) : dense ? 21 : 19)
        : fs(compact ? (dense ? 16 : 15) : dense ? 19 : 17);
    const separatorGap = fs(compact ? (dense ? 3 : 6) : dense ? 5 : 8);
    const pillLineHeight = Math.round(
      nameSize * (Platform.OS === "ios" ? 1.25 : 1.15),
    );
    const pillPadV = fs(
      compact
        ? dense
          ? Platform.OS === "ios"
            ? 10
            : 8
          : Platform.OS === "ios"
            ? 8
            : 6
        : dense
          ? Platform.OS === "ios"
            ? 11
            : 10
          : Platform.OS === "ios"
            ? 9
            : 8,
    );

    return (
      <View
        style={[
          styles.artistsPill,
          {
            borderColor: textColor,
            marginTop: fs(compact ? 12 : 20),
            paddingHorizontal: fs(compact ? (dense ? 9 : 14) : dense ? 13 : 18),
            paddingVertical: pillPadV,
          },
        ]}
      >
        <View style={styles.artistsPillRow}>
          {pillActs.map((act, index) => (
            <View
              key={`${act.name}-${index}`}
              style={styles.artistsPillSegment}
            >
              {index > 0 ? (
                templateId === "iridescent" ? (
                  <View
                    style={[
                      styles.artistsPillSquare,
                      {
                        backgroundColor: textColor,
                        width: fs(dense ? 5 : 3),
                        height: fs(dense ? 5 : 3),
                        marginHorizontal: separatorGap,
                      },
                    ]}
                  />
                ) : (
                  <Text
                    style={[
                      styles.artistsPillSep,
                      {
                        color: textColor,
                        fontSize: Math.round(nameSize * 0.55),
                        lineHeight: pillLineHeight,
                        marginHorizontal: separatorGap,
                      },
                    ]}
                  >
                    ×
                  </Text>
                )
              ) : null}
              <Text
                style={[
                  styles.artistsPillText,
                  {
                    color: textColor,
                    fontFamily: pillFont,
                    fontSize: nameSize,
                    lineHeight: pillLineHeight,
                    letterSpacing: dense ? 0 : 0.5,
                  },
                ]}
                numberOfLines={1}
              >
                {act.name}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderCenteredGrid = (
    gridActs: TemplateAct[],
    options: { marginTop?: number } = {},
  ) => {
    const [leftActs, rightActs] = splitIntoGridColumns(gridActs);
    const nameSize = fs(compact ? 12 : 15);
    const headlinerNameSize = fs(compact ? 14 : 18);

    return (
      <View
        style={[
          styles.gridWrap,
          {
            marginTop: options.marginTop,
          },
        ]}
      >
        <View style={[styles.gridColumn, styles.gridColumnLeft, { gap: fs(compact ? 8 : 12) }]}>
          {leftActs.map((act, index) =>
            renderGridCell(act, index, nameSize, headlinerNameSize, "left"),
          )}
        </View>
        <View style={[styles.gridColumn, styles.gridColumnRight, { gap: fs(compact ? 8 : 12) }]}>
          {rightActs.map((act, index) =>
            renderGridCell(act, index + leftActs.length, nameSize, headlinerNameSize, "right"),
          )}
        </View>
      </View>
    );
  };

  if (normalized.layout === "single" && acts[0]) {
    return (
      <View style={[styles.singleWrap, { marginTop: fs(compact ? 12 : 20), gap: fs(6) }]}>
        {normalized.introLabel ? (
          <Text style={[styles.introLabel, { color: mutedColor, fontSize: fs(10) }]}>
            {normalized.introLabel}
          </Text>
        ) : null}
        <Text
          style={[
            styles.singleName,
            {
              color: textColor,
              fontFamily: displayFont,
              fontSize: fs(compact ? 28 : 40),
            },
          ]}
        >
          {acts[0].name}
        </Text>
        {normalized.showSetTimes && acts[0].time ? (
          <Text style={[styles.singleTime, { color: accentColor, fontSize: fs(12) }]}>
            {acts[0].time}
          </Text>
        ) : null}
      </View>
    );
  }

  if (normalized.layout === "spotlight") {
    return (
      <View style={[styles.wrap, styles.spotlightWrap]}>
        {normalized.introLabel ? (
          <Text
            style={[
              styles.introLabel,
              { color: mutedColor, fontSize: fs(10), marginBottom: fs(10) },
            ]}
          >
            {normalized.introLabel}
          </Text>
        ) : null}
        {renderArtistsPill(acts)}
      </View>
    );
  }

  const headliner = acts.find((a) => a.headliner);
  const supports = acts.filter((a) => !a.headliner);

  return (
    <View style={[styles.wrap, wrapStyle, styles.wrapFlex]}>
      {normalized.introLabel ? (
        <Text
          style={[
            styles.introLabel,
            { color: mutedColor, fontSize: fs(10), marginBottom: fs(compact ? 6 : 10) },
          ]}
        >
          {normalized.introLabel}
        </Text>
      ) : null}

      {headliner ? (
        <View style={[styles.headlinerRow, { marginBottom: fs(compact ? 8 : 14), gap: fs(4) }]}>
          {normalized.showSetTimes && headliner.time ? (
            <Text style={[styles.headlinerTime, { color: accentColor, fontSize: fs(11) }]}>
              {headliner.time}
            </Text>
          ) : null}
          <Text
            style={[
              styles.headlinerName,
              {
                color: textColor,
                fontFamily: displayFont,
                fontSize: fs(compact ? 22 : 28),
              },
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
              <Text
                style={[
                  styles.festivalName,
                  { color: textColor, fontSize: fs(compact ? 10 : 12) },
                ]}
              >
                {act.name}
              </Text>
              {normalized.showSetTimes && act.time ? (
                <Text
                  style={[
                    styles.festivalTime,
                    { color: accentColor, fontSize: fs(10) },
                  ]}
                >
                  {act.time}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : normalized.layout === "column" ? (
        <View style={[styles.column, { gap: fs(compact ? 5 : 8) }]}>
          {(headliner ? supports : acts).map((act, index) => (
            <View key={`${act.name}-${index}`} style={styles.columnRow}>
              <Text
                style={[
                  styles.columnName,
                  { color: textColor, fontSize: fs(compact ? 12 : 14) },
                ]}
              >
                {act.name}
              </Text>
              {normalized.showSetTimes && act.time ? (
                <Text
                  style={[
                    styles.columnTime,
                    { color: accentColor, fontSize: fs(11), marginLeft: fs(8) },
                  ]}
                >
                  {act.time}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : (
        renderCenteredGrid(headliner ? supports : acts)
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
  },
  wrapFlex: {
    flexShrink: 1,
    minHeight: 0,
  },
  introLabel: {
    fontWeight: "700",
    letterSpacing: 2,
    textAlign: "center",
    textTransform: "uppercase",
  },
  singleWrap: {
    alignItems: "center",
  },
  singleName: {
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  singleTime: {
    fontWeight: "600",
    letterSpacing: 1,
  },
  headlinerRow: {
    alignItems: "center",
  },
  headlinerTime: {
    fontWeight: "600",
  },
  headlinerName: {
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  spotlightWrap: {
    alignItems: "center",
  },
  artistsPill: {
    borderWidth: 2,
    borderRadius: 40,
    alignSelf: "center",
    maxWidth: "100%",
  },
  artistsPillRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "nowrap",
  },
  artistsPillSegment: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
  },
  artistsPillSquare: {
    flexShrink: 0,
  },
  artistsPillSep: {
    fontWeight: "800",
    flexShrink: 0,
  },
  artistsPillText: {
    fontWeight: "800",
    textAlign: "center",
    flexShrink: 0,
  },
  gridWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    width: "100%",
  },
  gridColumn: {
    flexShrink: 1,
    maxWidth: "48%",
  },
  gridColumnLeft: {
    alignItems: "flex-start",
  },
  gridColumnRight: {
    alignItems: "flex-end",
  },
  gridCell: {},
  gridTime: {
    fontWeight: "600",
    textAlign: "left",
  },
  gridName: {
    fontWeight: "800",
    letterSpacing: 0.5,
    textAlign: "left",
  },
  column: {},
  columnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  columnName: {
    fontWeight: "700",
    flex: 1,
  },
  columnTime: {
    fontWeight: "600",
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
    fontWeight: "700",
    flex: 1,
  },
  festivalTime: {
    fontWeight: "600",
    marginLeft: 8,
  },
});
