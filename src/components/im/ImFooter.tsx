"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import logoWhite from "@/assets/im/horizontal-white.png";
import { IM_SITE, IM_TAGLINE, imFooterNav } from "@/lib/imSite";
import ImLeaveLink from "./ImLeaveLink";

// The big website-style footer belongs to the front screen only. Once someone
// is filling in the form, answering questions or reading results, a thin
// one-line footer keeps the page quiet.
export default function ImFooter() {
  const pathname = usePathname();

  if (pathname !== "/") {
    return (
      <footer className="bg-navy text-white">
        <div className="flex h-1.5" aria-hidden>
          <div className="flex-1 bg-blue" />
          <div className="flex-1 bg-green" />
        </div>
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-4 text-sm text-gray sm:px-6 lg:px-8">
          <span>© {new Date().getFullYear()} Intentional Ministries</span>
          <ImLeaveLink href={IM_SITE} className="text-white/90 underline underline-offset-4 hover:text-white">
            intentionalministries.com
          </ImLeaveLink>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-navy text-white">
      {/* Split band: Discipleship blue meets Marriage green */}
      <div className="flex h-2" aria-hidden>
        <div className="flex-1 bg-blue" />
        <div className="flex-1 bg-green" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <div className="flex flex-col gap-12 lg:flex-row lg:justify-between">
          <div className="max-w-xs">
            <ImLeaveLink href={IM_SITE} ariaLabel="Intentional Ministries website">
              <Image src={logoWhite} alt="Intentional Ministries" className="-ml-1.5 h-12 w-auto" />
            </ImLeaveLink>
            <p className="mt-5 text-base leading-relaxed text-gray">{IM_TAGLINE}</p>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:gap-x-16">
            {imFooterNav.map((group) => (
              <div key={group.heading}>
                <h2 className="eyebrow text-blue">{group.heading}</h2>
                <ul className="mt-4 space-y-3">
                  {group.items.map((item) => (
                    <li key={item.href + item.label}>
                      <ImLeaveLink
                        href={item.href}
                        className="text-base text-white/90 transition-colors hover:text-white"
                      >
                        {item.label}
                      </ImLeaveLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 border-t border-white/15 pt-6 text-sm text-gray/80">
          © {new Date().getFullYear()} Intentional Ministries. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
