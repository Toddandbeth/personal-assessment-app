import ScoreBar from "@/components/admin/ScoreBar";
import { deltaColor, formatDelta } from "@/lib/reportVisuals";
import type { ReportUnit, GrowthBlock } from "@/lib/admin/report";

function ChangeValue({ growth }: { growth: GrowthBlock }) {
  if (growth.count === 0) {
    return (
      <div className="flex h-6 items-center justify-center">
        <span className="text-sm text-zinc-400">–</span>
      </div>
    );
  }
  return (
    <div className="flex h-6 flex-col items-center justify-center">
      <span className="text-sm font-bold" style={{ color: deltaColor(growth.avgDelta!) }}>
        {formatDelta(growth.avgDelta!)}
      </span>
      <span className="text-[10px] text-zinc-500">{growth.count} matched</span>
    </div>
  );
}

export default function ReportUnitCard({ unit }: { unit: ReportUnit }) {
  return (
    <div className="flex flex-col gap-5 rounded-lg p-4" style={{ backgroundColor: "#ccd0d6" }}>
      <h2 className="text-base font-semibold" style={{ color: "#253551" }}>
        {unit.title}
      </h2>

      {unit.baselineTotal === 0 ? (
        <p className="text-sm text-zinc-600">
          No completed baseline assessments yet for this scope.
        </p>
      ) : (
        <>
          {unit.retakeTotal === 0 && (
            <p className="text-xs text-zinc-600">
              No retakes completed yet — After and Change show as “–” below.
            </p>
          )}

          <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <span>Before</span>
            <span>After</span>
            <span>Change</span>
          </div>

          {unit.sections.map((section) => (
            <div key={section.section} className="flex flex-col gap-3">
              <h3
                className="text-sm font-semibold uppercase tracking-wide"
                style={{ color: "#253551" }}
              >
                {section.section}
              </h3>
              {section.questions.map((q) => (
                <div key={q.questionId} className="flex flex-col gap-2 rounded-md bg-white p-3">
                  <p className="text-sm text-zinc-800">{q.prompt}</p>
                  <div className="grid grid-cols-3 gap-2">
                    <ScoreBar stat={q.baseline} />
                    <ScoreBar stat={q.retake} />
                    <ChangeValue growth={q.growth} />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
