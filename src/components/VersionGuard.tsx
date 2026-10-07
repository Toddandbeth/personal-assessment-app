"use client";

import { useEffect } from "react";

const MY_BUILD = process.env.NEXT_PUBLIC_BUILD_ID;

// A phone can keep this app alive in memory (especially as a home-screen web
// app) for days, running old code after a new version ships. When the app is
// opened or brought back to the foreground, compare our build stamp with the
// server's and reload if we're behind.
export default function VersionGuard() {
  useEffect(() => {
    async function check() {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        const { build } = await res.json();
        if (build && MY_BUILD && build !== MY_BUILD) window.location.reload();
      } catch {
        // Offline or transient — try again next time.
      }
    }
    check();
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", check);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", check);
    };
  }, []);

  return null;
}
