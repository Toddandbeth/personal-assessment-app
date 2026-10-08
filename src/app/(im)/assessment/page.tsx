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
    <div className="flex flex-1 flex-col bg-mist px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
      <div className="im-card mx-auto w-full max-w-md overflow-hidden border border-gray bg-white sm:max-w-xl lg:max-w-2xl">
        <div className="h-1.5 bg-blue" aria-hidden />
        <div className="px-6 py-8 sm:py-10">
          {/* key={track} resets the flow when switching between Begin and Returning */}
          <StartFlow key={track} track={track} door="intentionalministries" />
        </div>
      </div>
    </div>
  );
}
