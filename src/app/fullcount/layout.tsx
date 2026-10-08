import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";

// Fonts are only used by the Full Count front screen's headline and buttons.
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

// Everything under /fullcount is the Full Count door: private to Full Count
// groups, so it's kept out of search engines (also enforced by the
// X-Robots-Tag header in next.config.ts and by robots.txt).
export const metadata: Metadata = {
  title: "Personal Assessment — Full Count",
  description: "Full Count Ministries personal self-assessment",
  robots: { index: false, follow: false },
};

export default function FullCountLayout({ children }: { children: React.ReactNode }) {
  // The wrapper behaves exactly like the body it sits in (a growing column),
  // so every page inside lays out as it did before.
  return (
    <div className={`flex flex-1 flex-col ${barlow.variable} ${barlowCondensed.variable}`}>
      {children}
    </div>
  );
}
