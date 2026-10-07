import StartFlow from "@/components/StartFlow";
import type { EntryTrack } from "@/lib/supabase/types";

export default async function IntentionalMinistriesAssessment({
  searchParams,
}: {
  searchParams: Promise<{ track?: string }>;
}) {
  const { track: rawTrack } = await searchParams;
  // This door only has two entry points: take it for the first time, or
  // return. There is no group path and no high-school/adult question.
  const track: EntryTrack = rawTrack === "returning" ? "returning" : "standalone";

  return (
    <div className="w-full max-w-md flex-1 overflow-hidden bg-white px-6 py-8 sm:max-w-xl sm:flex-none sm:rounded-2xl sm:py-10 sm:shadow-sm lg:max-w-2xl">
      {/* key={track} resets the flow when switching between Begin and Returning */}
      <StartFlow key={track} track={track} door="intentionalministries" />
    </div>
  );
}
