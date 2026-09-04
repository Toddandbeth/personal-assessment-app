import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Rect,
  Defs,
  LinearGradient,
  Stop,
} from "@react-pdf/renderer";
import {
  computeBarWindow,
  gradientStopsForRange,
  deltaColor,
  formatDelta,
} from "@/lib/reportVisuals";
import type { ReportUnit, StatBlock, GrowthBlock } from "@/lib/admin/report";

const BRAND_NAVY = "#253551";
const BRAND_MIST = "#ccd0d6";
const BAR_WIDTH = 110;
const BAR_HEIGHT = 14;

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica" },
  header: {
    backgroundColor: BRAND_NAVY,
    marginHorizontal: -32,
    marginTop: -32,
    padding: 24,
    paddingBottom: 16,
    marginBottom: 16,
  },
  title: { fontSize: 16, fontWeight: 700, color: "#ffffff" },
  section: {
    fontSize: 10,
    fontWeight: 700,
    marginTop: 12,
    marginBottom: 4,
    textTransform: "uppercase",
    color: BRAND_NAVY,
  },
  columnHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  columnHeaderLabel: {
    width: BAR_WIDTH,
    textAlign: "center",
    fontSize: 7,
    fontWeight: 700,
    textTransform: "uppercase",
    color: "#52525b",
  },
  changeHeaderLabel: {
    width: 55,
    textAlign: "center",
    fontSize: 7,
    fontWeight: 700,
    textTransform: "uppercase",
    color: "#52525b",
  },
  questionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: BRAND_MIST,
  },
  prompt: { flex: 1, fontSize: 8.5 },
  empty: { fontSize: 10, color: "#71717a" },
});

function ScoreBarPdf({ stat, idSeed }: { stat: StatBlock; idSeed: string }) {
  if (stat.count === 0) {
    return (
      <View style={{ width: BAR_WIDTH }}>
        <View
          style={{
            height: BAR_HEIGHT,
            backgroundColor: BRAND_MIST,
            borderRadius: 2,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 7, color: "#71717a" }}>–</Text>
        </View>
        <Text style={{ fontSize: 6, color: "#71717a", textAlign: "center", marginTop: 2 }}>
          0 of {stat.total}
        </Text>
      </View>
    );
  }

  const { startFraction, endFraction } = computeBarWindow(stat.min!, stat.max!);
  const stops = gradientStopsForRange(stat.min!, stat.max!);
  const left = startFraction * BAR_WIDTH;
  const barW = (endFraction - startFraction) * BAR_WIDTH;
  const gradId = `grad-${idSeed}`;

  return (
    <View style={{ width: BAR_WIDTH }}>
      <View style={{ height: BAR_HEIGHT, position: "relative" }}>
        <Svg width={BAR_WIDTH} height={BAR_HEIGHT}>
          <Defs>
            <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
              {stops.map((color, i) => (
                <Stop
                  key={i}
                  offset={stops.length > 1 ? i / (stops.length - 1) : 0}
                  stopColor={color}
                />
              ))}
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={BAR_WIDTH} height={BAR_HEIGHT} fill={BRAND_MIST} rx={2} />
          <Rect x={left} y={0} width={barW} height={BAR_HEIGHT} fill={`url(#${gradId})`} />
        </Svg>
        <View
          style={{
            position: "absolute",
            left,
            width: barW,
            top: 0,
            height: BAR_HEIGHT,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 7, fontWeight: 700, color: "#ffffff" }}>{stat.avg}</Text>
        </View>
      </View>
      <Text style={{ fontSize: 6, color: "#71717a", textAlign: "center", marginTop: 2 }}>
        {stat.count} of {stat.total}
      </Text>
    </View>
  );
}

function ChangeValuePdf({ growth }: { growth: GrowthBlock }) {
  if (growth.count === 0) {
    return (
      <View style={{ width: 55, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 9, color: "#a1a1aa" }}>–</Text>
      </View>
    );
  }
  return (
    <View style={{ width: 55, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 9, fontWeight: 700, color: deltaColor(growth.avgDelta!) }}>
        {formatDelta(growth.avgDelta!)}
      </Text>
      <Text style={{ fontSize: 6, color: "#71717a" }}>{growth.count} matched</Text>
    </View>
  );
}

export default function ReportDocument({ units }: { units: ReportUnit[] }) {
  return (
    <Document>
      {units.map((unit, i) => (
        <Page key={i} size="LETTER" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.title}>{unit.title}</Text>
          </View>

          {unit.baselineTotal === 0 ? (
            <Text style={styles.empty}>
              No completed baseline assessments yet for this scope.
            </Text>
          ) : (
            <>
              <View style={styles.columnHeaderRow}>
                <Text style={{ flex: 1 }} />
                <Text style={styles.columnHeaderLabel}>Before</Text>
                <Text style={styles.columnHeaderLabel}>After</Text>
                <Text style={styles.changeHeaderLabel}>Change</Text>
              </View>

              {unit.sections.map((section) => (
                <View key={section.section} wrap={false}>
                  <Text style={styles.section}>{section.section}</Text>
                  {section.questions.map((q) => (
                    <View key={q.questionId} style={styles.questionRow}>
                      <Text style={styles.prompt}>{q.prompt}</Text>
                      <ScoreBarPdf stat={q.baseline} idSeed={`${q.questionId}-b`} />
                      <ScoreBarPdf stat={q.retake} idSeed={`${q.questionId}-r`} />
                      <ChangeValuePdf growth={q.growth} />
                    </View>
                  ))}
                </View>
              ))}
            </>
          )}
        </Page>
      ))}
    </Document>
  );
}
