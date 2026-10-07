"use client";

import Link from "next/link";

export default function ReturningNotFound() {
  return (
    <div className="flex flex-col gap-5 text-center">
      <h1 className="text-xl font-semibold text-[#253551]">
        We couldn&apos;t find a previous assessment under that name and
        number — would you like to start fresh instead?
      </h1>

      <div className="flex flex-col gap-3">
        <Link
          href="/start?track=group"
          className="rounded-full bg-[#253551] px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-[#1a2740]"
        >
          I&apos;m in a group
        </Link>
        <Link
          href="/start?track=standalone"
          className="rounded-full border border-[#ccd0d6] px-5 py-2.5 text-center text-sm font-medium text-[#253551] hover:bg-[#ccd0d6]/40"
        >
          I&apos;m on my own
        </Link>
        <Link
          href="/"
          className="text-sm font-medium text-[#7993c2] hover:text-[#253551]"
        >
          Return to home screen
        </Link>
      </div>
    </div>
  );
}
