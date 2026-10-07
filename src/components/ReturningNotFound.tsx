"use client";

import Link from "next/link";
import { DOOR_IM, type Door } from "@/lib/doors";

export default function ReturningNotFound({
  door = "fullcount",
  onRetry,
}: {
  door?: Door;
  onRetry?: () => void;
}) {
  if (door === DOOR_IM) {
    // Deliberately says nothing about whether any such person exists.
    return (
      <div className="flex flex-col gap-5 text-center">
        <h1 className="text-2xl font-bold text-[#253551]">
          We couldn&apos;t find an assessment with those details.
        </h1>
        <p className="text-zinc-600">
          Check your first name, the last four digits of your phone number, and
          your PIN, and try again. If you&apos;d like to take the assessment for
          the first time, you can begin one now.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={onRetry}
            className="rounded-full bg-[#253551] px-5 py-3 text-base font-semibold text-white hover:bg-[#1a2740]"
          >
            Try again
          </button>
          <Link
            href="/assessment"
            className="rounded-full border border-[#ccd0d6] px-5 py-3 text-center text-base font-semibold text-[#253551] hover:bg-[#ccd0d6]/40"
          >
            Begin the assessment
          </Link>
          <Link href="/" className="text-sm font-medium text-[#7993c2] hover:text-[#253551]">
            Return to home screen
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 text-center">
      <h1 className="text-xl font-semibold text-[#253551]">
        We couldn&apos;t find a previous assessment under that name and
        number — would you like to start fresh instead?
      </h1>

      <div className="flex flex-col gap-3">
        <Link
          href="/fullcount/start?track=group"
          className="rounded-full bg-[#253551] px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-[#1a2740]"
        >
          I&apos;m in a group
        </Link>
        <Link
          href="/fullcount/start?track=standalone"
          className="rounded-full border border-[#ccd0d6] px-5 py-2.5 text-center text-sm font-medium text-[#253551] hover:bg-[#ccd0d6]/40"
        >
          I&apos;m on my own
        </Link>
        <Link
          href="/fullcount"
          className="text-sm font-medium text-[#7993c2] hover:text-[#253551]"
        >
          Return to home screen
        </Link>
      </div>
    </div>
  );
}
