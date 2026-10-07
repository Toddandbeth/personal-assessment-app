import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-16">
      <div className="flex w-full max-w-sm flex-col items-center gap-8 text-center">
        <h1 className="flex flex-col items-center">
          <span className="text-4xl font-extrabold leading-tight text-[#253551] sm:text-5xl">
            Personal Assessment
          </span>
          <span className="mt-1 text-lg font-semibold text-[#253551]/70">
            Full Count
          </span>
        </h1>

        <p className="text-sm leading-6 text-zinc-600">
          A short self-evaluation to help you see where you&apos;re growing over
          the course of your group. You&apos;ll answer a series of questions once
          at the start of your group, and again at the end, to see your own
          progress. Before you begin, get your Region and Group number from
          your group leader (for example, &ldquo;TN2026, Group 03&rdquo;).
          You&apos;ll also need your first name and the last four digits of your
          phone number, so you can find your results again later.
        </p>

        <div className="flex w-full flex-col gap-3">
          <Link
            href="/start?track=group"
            className="rounded-full bg-[#253551] px-6 py-4 text-base font-semibold text-white hover:bg-[#1a2740]"
          >
            I&apos;m in a group
          </Link>
          <Link
            href="/start?track=standalone"
            className="rounded-full border border-[#ccd0d6] px-6 py-4 text-base font-semibold text-[#253551] hover:bg-white"
          >
            I&apos;m on my own
          </Link>
          <Link
            href="/start?track=returning"
            className="rounded-full border border-[#ccd0d6] px-6 py-4 text-base font-semibold text-[#253551] hover:bg-white"
          >
            I&apos;m returning
          </Link>
        </div>

        <Link href="/admin" className="text-xs text-[#7993c2] hover:text-[#253551]">
          Admin access
        </Link>
        <p className="text-[10px] text-zinc-400">Version {process.env.NEXT_PUBLIC_BUILD_ID}</p>
      </div>
    </div>
  );
}
