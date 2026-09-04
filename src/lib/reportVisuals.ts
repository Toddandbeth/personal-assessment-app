// Shared by both the on-screen report (src/components/admin/ScoreBar.tsx)
// and the PDF report (src/lib/pdf/ReportDocument.tsx) so the two stay
// visually consistent despite using completely different rendering
// primitives (DOM/CSS vs. react-pdf's View/Svg). Pure functions only —
// safe to import from Client Components and from server-rendered PDF code.

// Fixed 1-5 red-to-green scale. This gradient carries real meaning (score
// severity) and must never be swapped for a brand color.
export const SCALE_COLORS = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"] as const;

export function positionForScore(score: number): number {
  return (Math.min(5, Math.max(1, score)) - 1) / 4;
}

export interface BarWindow {
  startFraction: number;
  endFraction: number;
}

// A single unanimous score (min === max) would otherwise be a zero-width
// band and effectively invisible — pad it to a small minimum width.
const MIN_WINDOW_PAD = 0.08;

export function computeBarWindow(min: number, max: number): BarWindow {
  let start = positionForScore(min);
  let end = positionForScore(max);
  if (start === end) {
    start = Math.max(0, start - MIN_WINDOW_PAD);
    end = Math.min(1, end + MIN_WINDOW_PAD);
  }
  return { startFraction: start, endFraction: end };
}

// Colors for a CSS/SVG gradient spanning just [min, max] of the fixed
// 1-5 scale (e.g. min=2,max=5 -> the "2 through 5" slice of the full
// gradient, not a fresh red-to-green stretch).
export function gradientStopsForRange(min: number, max: number): string[] {
  const lo = Math.min(5, Math.max(1, Math.round(min)));
  const hi = Math.min(5, Math.max(1, Math.round(max)));
  const stops: string[] = [];
  for (let v = lo; v <= hi; v++) {
    stops.push(SCALE_COLORS[v - 1]);
  }
  return stops.length > 0 ? stops : [SCALE_COLORS[lo - 1]];
}

export function deltaColor(delta: number): string {
  if (delta > 0) return "#16a34a";
  if (delta < 0) return "#dc2626";
  return "#71717a";
}

export function formatDelta(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}
