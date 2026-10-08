import Image from "next/image";
import Link from "next/link";
import texture from "@/assets/im/discipleship-blue.jpg";

// Same family as the Intentional Ministries front screen: navy and blue,
// condensed headline, square buttons. Mobile-only layout, as always.
const display = "font-[family-name:var(--font-barlow-condensed)] uppercase";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-white font-[family-name:var(--font-barlow)] text-[#1a2233]">
      <div className="h-[10px] bg-[linear-gradient(to_bottom,#253551_0_60%,#ccd0d6_60%_100%)]" aria-hidden />

      <section className="relative isolate overflow-hidden bg-[#253551] text-white">
        <Image src={texture} alt="" fill priority sizes="100vw" className="-z-10 object-cover" />
        <div className="mx-auto w-full max-w-sm px-6 py-12">
          <h1 className="flex flex-col [text-shadow:0_2px_18px_rgba(0,0,0,0.3)]">
            <span className={`${display} text-[3.4rem] font-semibold leading-[0.95] tracking-[0.02em]`}>
              Personal Assessment
            </span>
            <span className={`${display} mt-4 text-xl font-medium tracking-[0.18em] text-[#7993c2]`}>
              Full Count
            </span>
          </h1>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-9 px-6 py-10">
        <p className="text-lg leading-8">
          A short self-evaluation to help you see where you&apos;re growing over
          the course of your group. You&apos;ll answer a series of questions once
          at the start of your group, and again at the end, to see your own
          progress. Before you begin, get your Region and Group number from
          your group leader (for example, &ldquo;TN2026, Group 03&rdquo;).
          You&apos;ll also need your first name and the last four digits of your
          phone number, so you can find your results again later.
        </p>

        <div className="flex w-full flex-col gap-4">
          <Link
            href="/fullcount/start?track=group"
            className={`${display} flex min-h-16 items-center justify-center bg-[#253551] px-6 text-xl font-semibold tracking-[0.1em] text-white hover:bg-[#1a2233]`}
          >
            I&apos;m in a group
          </Link>
          <Link
            href="/fullcount/start?track=standalone"
            className={`${display} flex min-h-16 items-center justify-center border-2 border-[#253551] px-6 text-xl font-semibold tracking-[0.1em] text-[#253551] hover:bg-[#253551] hover:text-white`}
          >
            I&apos;m on my own
          </Link>
          <Link
            href="/fullcount/start?track=returning"
            className={`${display} flex min-h-16 items-center justify-center border-2 border-[#253551] px-6 text-xl font-semibold tracking-[0.1em] text-[#253551] hover:bg-[#253551] hover:text-white`}
          >
            I&apos;m returning
          </Link>
        </div>

        <div className="mt-auto flex flex-col items-center gap-2 pt-4">
          <Link href="/fullcount/admin" className="text-sm text-[#7993c2] underline underline-offset-4 hover:text-[#253551]">
            Admin access
          </Link>
          <p className="text-[10px] text-zinc-400">Version {process.env.NEXT_PUBLIC_BUILD_ID}</p>
        </div>
      </div>
    </div>
  );
}
