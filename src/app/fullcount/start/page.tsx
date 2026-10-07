import StartFlow from "@/components/StartFlow";
import type { EntryTrack } from "@/lib/supabase/types";

export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string }>;
}) {
  const { track: rawTrack } = await searchParams;
  const track: EntryTrack =
    rawTrack === "standalone" ? "standalone" : rawTrack === "returning" ? "returning" : "group";

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-12">
      <div className="w-full max-w-sm">
        {/* key={track} forces a full remount on track change — otherwise
            clicking between "I'm in a group" / "I'm on my own" / "I'm
            returning" links (same route, just a different ?track= query)
            leaves all of StartFlow's internal phase/state stuck from
            whatever screen was showing before, so the new track's entry
            form silently never appears. */}
        <StartFlow key={track} track={track} />
      </div>
    </div>
  );
}
