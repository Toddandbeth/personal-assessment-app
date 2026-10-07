import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import ImHeader from "@/components/im/ImHeader";
import ImFooter from "@/components/im/ImFooter";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["500", "600"],
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

export default function IntentionalMinistriesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`im-root flex min-h-screen flex-col ${barlow.variable} ${barlowCondensed.variable}`}
    >
      <ImHeader />
      <main className="flex flex-1 flex-col">{children}</main>
      <ImFooter />
    </div>
  );
}
