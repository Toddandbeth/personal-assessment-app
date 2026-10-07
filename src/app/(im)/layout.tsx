import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import fs from "fs";
import path from "path";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const TITLE = "Personal Assessment | Intentional Ministries";
const DESCRIPTION =
  "A short, private self-evaluation to help you see where you're growing in your faith and daily life. Take it now and again later to see your own progress.";

// This door is public and meant to be found by search engines.
export const metadata: Metadata = {
  metadataBase: new URL("https://personal-assessment.intentionalministries.com"),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Intentional Ministries",
    type: "website",
  },
  robots: { index: true, follow: true },
};

// Drop a logo into public/brand/ named im-logo.svg, im-logo.png or
// im-logo.webp and it appears in the header automatically. Until then a
// text wordmark is shown.
function findLogo(): string | null {
  for (const name of ["im-logo.svg", "im-logo.png", "im-logo.webp"]) {
    if (fs.existsSync(path.join(process.cwd(), "public", "brand", name))) {
      return `/brand/${name}`;
    }
  }
  return null;
}

export default function IntentionalMinistriesLayout({ children }: { children: React.ReactNode }) {
  const logo = findLogo();
  return (
    <div
      className={`im-root flex min-h-screen flex-col ${barlow.variable} ${barlowCondensed.variable}`}
    >
      <header className="border-b border-[#ccd0d6] bg-white">
        <div className="mx-auto flex max-w-5xl items-center px-6 py-4">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="Intentional Ministries" className="h-10 w-auto" />
          ) : (
            <span className="font-[family-name:var(--font-barlow-condensed)] text-2xl font-bold uppercase tracking-wide text-[#253551]">
              Intentional Ministries
            </span>
          )}
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center sm:px-6 sm:py-10">{children}</main>

      <footer className="bg-[#253551] px-6 py-5 text-center text-sm text-white">
        <a
          href="https://intentionalministries.com"
          className="font-medium underline-offset-4 hover:underline"
        >
          ← Back to intentionalministries.com
        </a>
      </footer>
    </div>
  );
}
