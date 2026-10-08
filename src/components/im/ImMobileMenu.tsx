"use client";

import { useEffect, useState } from "react";
import { imMainNav } from "@/lib/imSite";
import ImLeaveLink from "./ImLeaveLink";

const marker = {
  discipleship: "bg-navy",
  marriage: "bg-green",
  default: "bg-gray",
};

export default function ImMobileMenu() {
  const [open, setOpen] = useState(false);

  // Stop the page behind from scrolling while the menu is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="im-mobile-menu"
        className="-mr-2 flex h-11 w-11 items-center justify-center text-navy"
      >
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        <span className="relative block h-4 w-6" aria-hidden>
          <span
            className={`absolute left-0 h-[2.5px] w-6 bg-current transition-all ${open ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0"}`}
          />
          <span
            className={`absolute left-0 top-1/2 h-[2.5px] w-6 -translate-y-1/2 bg-current transition-opacity ${open ? "opacity-0" : ""}`}
          />
          <span
            className={`absolute left-0 h-[2.5px] w-6 bg-current transition-all ${open ? "top-1/2 -translate-y-1/2 -rotate-45" : "bottom-0"}`}
          />
        </span>
      </button>

      <nav
        id="im-mobile-menu"
        aria-label="Main"
        hidden={!open}
        className="fixed inset-x-0 bottom-0 top-[75px] z-50 overflow-y-auto bg-paper"
      >
        <ul className="divide-y divide-gray/60 border-t border-gray/60 px-4 sm:px-6">
          {imMainNav.map((item) => (
            <li key={item.href}>
              <ImLeaveLink href={item.href} className="flex items-center gap-4 py-5">
                <span
                  className={`h-8 w-1.5 shrink-0 opacity-60 ${marker[item.series ?? "default"]}`}
                  aria-hidden
                />
                <span className="display text-[2rem] text-navy">{item.label}</span>
              </ImLeaveLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
