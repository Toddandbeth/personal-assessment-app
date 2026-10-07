import Image from "next/image";
import ImButton from "@/components/im/ImButton";
import texture from "@/assets/im/discipleship-blue.jpg";
import markWhite from "@/assets/im/mark-white.png";

export default function IntentionalMinistriesHome() {
  return (
    <>
      {/* Bold banner: same look as the top of the website's home page */}
      <section className="relative isolate overflow-hidden bg-navy text-white">
        <Image src={texture} alt="" fill priority sizes="100vw" className="-z-20 object-cover" />
        <Image
          src={markWhite}
          alt=""
          aria-hidden
          priority
          sizes="700px"
          className="pointer-events-none absolute right-[4%] top-1/2 -z-10 hidden h-[70%] w-auto -translate-y-1/2 opacity-45 mix-blend-soft-light lg:right-[7%] lg:block lg:h-[72%]"
        />

        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-28">
          <p className="font-display text-base font-medium uppercase tracking-[0.18em] sm:text-lg">
            Intentional Ministries
          </p>
          <h1 className="display mt-4 text-[2.9rem] [text-shadow:0_2px_18px_rgba(0,0,0,0.3)] sm:text-7xl lg:text-[6.5rem]">
            <span className="block text-[3.6rem] text-blue sm:text-[5.5rem] lg:text-[8.5rem]">
              Personal
            </span>
            Assessment
          </h1>
          <p className="mt-5 max-w-xl text-xl leading-snug [text-shadow:0_1px_10px_rgba(0,0,0,0.35)] sm:text-2xl">
            A short, private self-evaluation to see where you&apos;re growing in your faith and daily life.
          </p>
        </div>
      </section>

      {/* Light section: what to expect, then the two doors in */}
      <section className="bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[5fr_7fr] lg:gap-20">
            <div>
              <p className="eyebrow text-blue">How it works</p>
              <h2 className="display mt-2 text-[2.75rem] text-navy sm:text-6xl">
                <span className="text-blue">Intentional</span> growth you can see
              </h2>
            </div>

            <div className="flex flex-col gap-6">
              <p className="text-xl leading-relaxed sm:text-[1.4rem]">
                You&apos;ll answer a series of questions now, and again later, so you can see your own
                progress over time.
              </p>
              <p className="text-xl leading-relaxed sm:text-[1.4rem]">
                Your individual answers are private. Only combined totals are ever seen by Intentional
                Ministries.
              </p>
              <p className="text-xl leading-relaxed sm:text-[1.4rem]">
                To begin you&apos;ll need your first name, the last four digits of your phone number,
                and a 4-digit PIN you choose. You&apos;ll use all three to come back and see your
                results.
              </p>

              <div className="border-l-4 border-blue bg-[#eef1f6] p-5">
                <p className="text-xl font-semibold leading-snug text-navy">
                  If you ever forget your PIN there is no way to recover it, so write it down.
                </p>
              </div>

              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <ImButton href="/assessment" variant="navy">
                  Begin
                </ImButton>
                <ImButton href="/assessment?track=returning" variant="outline-navy">
                  I&apos;m returning
                </ImButton>
              </div>
            </div>
          </div>
        </div>
        <div className="flex h-1.5" aria-hidden>
          <div className="flex-1 bg-blue" />
          <div className="flex-1 bg-green" />
        </div>
      </section>
    </>
  );
}
