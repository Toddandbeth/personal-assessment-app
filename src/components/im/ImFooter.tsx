import Image from "next/image";
import Link from "next/link";
import logoWhite from "@/assets/im/horizontal-white.png";
import { IM_TAGLINE, imFooterNav } from "@/lib/imSite";

export default function ImFooter() {
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
            <Link href="/" aria-label="Intentional Ministries Personal Assessment home">
              <Image src={logoWhite} alt="Intentional Ministries" className="-ml-1.5 h-12 w-auto" />
            </Link>
            <p className="mt-5 text-base leading-relaxed text-gray">{IM_TAGLINE}</p>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:gap-x-16">
            {imFooterNav.map((group) => (
              <div key={group.heading}>
                <h2 className="eyebrow text-blue">{group.heading}</h2>
                <ul className="mt-4 space-y-3">
                  {group.items.map((item) => (
                    <li key={item.href + item.label}>
                      <a
                        href={item.href}
                        className="text-base text-white/90 transition-colors hover:text-white"
                      >
                        {item.label}
                      </a>
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
