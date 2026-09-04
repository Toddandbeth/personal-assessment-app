import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
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
  prompt: { flex: 1 },
  cell: { width: 50, textAlign: "center" },
  changeCell: { width: 60, textAlign: "center", fontWeight: 700 },
  headerCell: { width: 50, textAlign: "center", fontWeight: 700 },
  headerChangeCell: { width: 60, textAlign: "center", fontWeight: 700 },
});

export default function ComparisonDocument({
  rows,
  firstName,
}: {
  rows: ComparisonRow[];
  firstName: string;
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
          <Text style={styles.subtitle}>Before-and-after comparison</Text>
        </View>

        {sections.map((s) => (
          <View key={s.section} wrap={false}>
            <Text style={styles.section}>{s.section}</Text>
            <View style={styles.headerRow}>
              <Text style={styles.prompt}>Question</Text>
              <Text style={styles.headerCell}>Before</Text>
              <Text style={styles.headerCell}>After</Text>
              <Text style={styles.headerChangeCell}>Change</Text>
            </View>
            {s.rows.map((row) => {
              const hasBoth = row.baseline_score !== null && row.retake_score !== null;
              const delta = hasBoth ? row.retake_score! - row.baseline_score! : null;
              return (
                <View key={row.prompt} style={styles.row}>
                  <Text style={styles.prompt}>{row.prompt}</Text>
                  <Text style={styles.cell}>{row.baseline_score ?? "–"}</Text>
                  <Text style={styles.cell}>{row.retake_score ?? "–"}</Text>
                  <Text
                    style={[
                      styles.changeCell,
                      { color: delta === null ? "#a1a1aa" : deltaColor(delta) },
                    ]}
                  >
                    {delta === null
                      ? "–"
                      : `${delta > 0 ? "▲" : delta < 0 ? "▼" : "–"} ${formatDelta(delta)}`}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
      </Page>
    </Document>
  );
}
