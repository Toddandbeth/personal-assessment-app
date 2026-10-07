import { Document, Page, Text, View, StyleSheet, Svg, Polygon } from "@react-pdf/renderer";
import { deltaColor, formatDelta } from "@/lib/reportVisuals";
import type { ComparisonRow } from "@/lib/supabase/types";

const BRAND_NAVY = "#253551";
const BRAND_MIST = "#ccd0d6";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  header: {
    backgroundColor: BRAND_NAVY,
    marginHorizontal: -32,
    marginTop: -32,
    padding: 24,
    paddingBottom: 16,
    marginBottom: 20,
  },
  title: { fontSize: 18, marginBottom: 4, fontWeight: 700, color: "#ffffff" },
  subtitle: { fontSize: 11, color: "#ccd0d6" },
  section: {
    fontSize: 11,
    fontWeight: 700,
    marginTop: 16,
    marginBottom: 6,
    textTransform: "uppercase",
    color: BRAND_NAVY,
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: BRAND_MIST,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BRAND_MIST,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  goalBox: {
    backgroundColor: "#eceef1",
    padding: 10,
    borderRadius: 4,
    marginBottom: 4,
  },
  goalLabel: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: "uppercase",
    color: BRAND_NAVY,
    marginBottom: 2,
  },
  goalText: { fontSize: 10 },
  prompt: { flex: 1 },
  cell: { width: 50, textAlign: "center" },
  changeCellBox: {
    width: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCell: { width: 50, textAlign: "center", fontWeight: 700 },
  headerChangeCell: { width: 60, textAlign: "center", fontWeight: 700 },
});

export default function ComparisonDocument({
  rows,
  firstName,
  baselineOnly = false,
  goalBaseline = null,
  goalRetake = null,
}: {
  rows: ComparisonRow[];
  firstName: string;
  baselineOnly?: boolean;
  goalBaseline?: string | null;
  goalRetake?: string | null;
}) {
  const sections: { section: string; rows: ComparisonRow[] }[] = [];
  for (const row of rows) {
    const last = sections[sections.length - 1];
    if (last && last.section === row.section) {
      last.rows.push(row);
    } else {
      sections.push({ section: row.section, rows: [row] });
    }
  }

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{firstName ? `${firstName}'s Results` : "Your Results"}</Text>
          <Text style={styles.subtitle}>
            {baselineOnly ? "Your answers from this assessment" : "Before-and-after comparison"}
          </Text>
        </View>

        {(goalBaseline || goalRetake) && (
          <View style={styles.goalBox}>
            {goalBaseline && (
              <View>
                <Text style={styles.goalLabel}>Your goal</Text>
                <Text style={styles.goalText}>{goalBaseline}</Text>
              </View>
            )}
            {goalRetake && (
              <View style={{ marginTop: goalBaseline ? 8 : 0 }}>
                <Text style={styles.goalLabel}>Your goal going forward</Text>
                <Text style={styles.goalText}>{goalRetake}</Text>
              </View>
            )}
          </View>
        )}

        {sections.map((s) => (
          <View key={s.section} wrap={false}>
            <Text style={styles.section}>{s.section}</Text>
            <View style={styles.headerRow}>
              <Text style={styles.prompt}>Question</Text>
              <Text style={styles.headerCell}>{baselineOnly ? "Score" : "Before"}</Text>
              {!baselineOnly && (
                <>
                  <Text style={styles.headerCell}>After</Text>
                  <Text style={styles.headerChangeCell}>Change</Text>
                </>
              )}
            </View>
            {s.rows.map((row) => {
              const hasBoth = row.baseline_score !== null && row.retake_score !== null;
              const delta = hasBoth ? row.retake_score! - row.baseline_score! : null;
              return (
                <View key={row.prompt} style={styles.row}>
                  <Text style={styles.prompt}>{row.prompt}</Text>
                  <Text style={styles.cell}>{row.baseline_score ?? "–"}</Text>
                  {!baselineOnly && (
                    <>
                      <Text style={styles.cell}>{row.retake_score ?? "–"}</Text>
                      <View style={styles.changeCellBox}>
                        {delta !== null && delta !== 0 && (
                          // Drawn shape, not a text glyph: Helvetica has no
                          // arrow characters and silently substitutes stray
                          // ones (▲ printed as "²", ▼ as "¼").
                          <Svg width={7} height={7} style={{ marginRight: 3 }}>
                            <Polygon
                              points={delta > 0 ? "3.5,0 7,7 0,7" : "0,0 7,0 3.5,7"}
                              fill={deltaColor(delta)}
                            />
                          </Svg>
                        )}
                        <Text
                          style={{
                            fontWeight: 700,
                            color: delta === null ? "#a1a1aa" : deltaColor(delta),
                          }}
                        >
                          {delta === null ? "-" : formatDelta(delta)}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </Page>
    </Document>
  );
}
