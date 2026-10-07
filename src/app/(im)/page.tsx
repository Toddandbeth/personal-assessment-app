import Link from "next/link";

export default function IntentionalMinistriesHome() {
  return (
    <div className="flex w-full max-w-2xl flex-1 flex-col justify-center gap-8 px-6 py-12 text-center sm:flex-none sm:py-8">
      <h1 className="flex flex-col items-center">
        <span className="text-5xl font-bold uppercase leading-none tracking-wide text-[#253551] sm:text-7xl">
          Personal Assessment
        </span>
        <span className="mt-3 text-xl font-semibold uppercase tracking-[0.2em] text-[#7993c2] sm:text-2xl">
          Intentional Ministries
        </span>
      </h1>

      <div className="mx-auto flex max-w-xl flex-col gap-4 text-lg leading-8 text-zinc-700">
        <p>
          A short, private self-evaluation to help you see where you&apos;re growing
          in your faith and daily life.
        </p>
        <p>
          You&apos;ll answer a series of questions now, and again later, so you can
          see your own progress over time. Your individual answers are private;
          only combined totals are ever seen by Intentional Ministries.
        </p>
        <p>
          To begin you&apos;ll need your first name, the last four digits of your phone
          number, and a 4-digit PIN you choose. You&apos;ll use all three to come back
          and see your results.{" "}
          <strong className="text-[#253551]">
            If you ever forget your PIN there is no way to recover it, so write it down.
          </strong>
        </p>
      </div>

      <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
        <Link
          href="/assessment"
          className="rounded-full bg-[#253551] px-6 py-4 text-lg font-semibold text-white hover:bg-[#1a2740]"
        >
          Begin
        </Link>
        <Link
          href="/assessment?track=returning"
          className="rounded-full border-2 border-[#253551]/30 bg-white px-6 py-4 text-lg font-semibold text-[#253551] hover:bg-[#ccd0d6]/30"
        >
          I&apos;m returning
        </Link>
      </div>
    </div>
  );
}
