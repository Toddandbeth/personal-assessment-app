import { computeBarWindow, gradientStopsForRange } from "@/lib/reportVisuals";
import type { StatBlock } from "@/lib/admin/report";

export default function ScoreBar({ stat }: { stat: StatBlock }) {
  if (stat.count === 0) {
    return (
      <div className="flex flex-col gap-1">
        <div className="relative h-6 w-full rounded-md" style={{ background: "#ccd0d6" }}>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-zinc-500">
            –
          </span>
        </div>
        <p className="text-center text-xs text-zinc-500">0 of {stat.total}</p>
      </div>
    );
  }

  const { startFraction, endFraction } = computeBarWindow(stat.min!, stat.max!);
  const stops = gradientStopsForRange(stat.min!, stat.max!);
  const fill = stops.length > 1 ? `linear-gradient(to right, ${stops.join(", ")})` : stops[0];

  return (
    <div className="flex flex-col gap-1">
      <div
        className="relative h-6 w-full overflow-hidden rounded-md"
        style={{ background: "#ccd0d6" }}
      >
        <div
          className="absolute inset-y-0 flex items-center justify-center"
          style={{
            left: `${startFraction * 100}%`,
            width: `${(endFraction - startFraction) * 100}%`,
            background: fill,
          }}
        >
          <span className="text-xs font-bold text-white">{stat.avg}</span>
        </div>
      </div>
      <p className="text-center text-xs text-zinc-500">
        {stat.count} of {stat.total}
      </p>
    </div>
  );
}
