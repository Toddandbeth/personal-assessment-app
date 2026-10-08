"use client";

import { useEffect } from "react";
import { setAssessmentInProgress } from "@/lib/inProgress";

// Turns off the phone's pull-down-to-refresh while the entry/question flow is
// on screen. A pull-to-refresh reloads the page, which wipes everything the
// person typed (including their PIN).
export function useNoPullToRefresh() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overscrollBehaviorY;
    const prevBody = body.style.overscrollBehaviorY;
    html.style.overscrollBehaviorY = "none";
    body.style.overscrollBehaviorY = "none";
    return () => {
      html.style.overscrollBehaviorY = prevHtml;
      body.style.overscrollBehaviorY = prevBody;
    };
  }, []);
}

// Mounted only while questions/review are on screen. While mounted: links
// that leave the assessment ask first, and desktop browsers warn before an
// accidental reload or tab close.
export function InProgressMarker() {
  useEffect(() => {
    setAssessmentInProgress(true);
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      setAssessmentInProgress(false);
    };
  }, []);
  return null;
}
