import StartFlow from "@/components/StartFlow";
import type { Track } from "@/lib/supabase/types";

export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string }>;
}) {
  const { track: rawTrack } = await searchParams;
  const track: Track = rawTrack === "standalone" ? "standalone" : "group";

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-12">
      <div className="w-full max-w-sm">
        <StartFlow track={track} />
      </div>
    </div>
  );
}
