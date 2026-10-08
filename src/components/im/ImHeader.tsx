import Image from "next/image";
import logo from "@/assets/im/horizontal-navy.png";
import { IM_SITE, imMainNav } from "@/lib/imSite";
import ImLeaveLink from "./ImLeaveLink";
import ImMobileMenu from "./ImMobileMenu";

const underline = {
  discipleship: "after:bg-blue",
  marriage: "after:bg-green",
  default: "after:bg-navy",
};

export default function ImHeader() {
  return (
    <header className="sticky top-0 z-40 bg-paper">
      <div className="cover-band" />
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:h-20 lg:px-8">
        <ImLeaveLink href={IM_SITE} className="shrink-0" ariaLabel="Intentional Ministries website">
          <Image
            src={logo}
            alt="Intentional Ministries"
            priority
            className="-ml-1.5 h-11 w-auto lg:h-[3.4rem]"
          />
        </ImLeaveLink>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-9">
            {imMainNav.map((item) => (
              <li key={item.href}>
                <ImLeaveLink
                  href={item.href}
                  className={`relative font-display text-[1.1rem] font-medium uppercase tracking-[0.12em] text-navy transition-colors hover:text-ink after:absolute after:-bottom-1.5 after:left-0 after:h-[3px] after:w-full after:origin-left after:scale-x-0 after:transition-transform hover:after:scale-x-100 ${
                    underline[item.series ?? "default"]
                  }`}
                >
                  {item.label}
                </ImLeaveLink>
              </li>
            ))}
          </ul>
        </nav>

        <ImMobileMenu />
      </div>
      <div className="h-px bg-gray/70" />
    </header>
  );
}
