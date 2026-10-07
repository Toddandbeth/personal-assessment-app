import type { Metadata } from "next";

// Everything under /fullcount is the Full Count door: private to Full Count
// groups, so it's kept out of search engines (also enforced by the
// X-Robots-Tag header in next.config.ts and by robots.txt).
export const metadata: Metadata = {
  title: "Personal Assessment — Full Count",
  description: "Full Count Ministries personal self-assessment",
  robots: { index: false, follow: false },
};

export default function FullCountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
