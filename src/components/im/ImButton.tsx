import Link from "next/link";
import type { ReactNode } from "react";

// Same button shapes as the website: square corners, condensed caps.
const variants = {
  navy: "bg-navy text-white hover:bg-ink",
  "outline-navy": "border-2 border-navy text-navy hover:bg-navy hover:text-white",
  light: "bg-white text-navy hover:bg-mist",
  "outline-light": "border-2 border-white/80 text-white hover:bg-white hover:text-navy",
};

export default function ImButton({
  href,
  children,
  variant = "navy",
}: {
  href: string;
  children: ReactNode;
  variant?: keyof typeof variants;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap px-6 py-3 font-display text-[1.1rem] font-semibold uppercase tracking-[0.1em] transition-colors ${variants[variant]}`}
    >
      {children}
    </Link>
  );
}
