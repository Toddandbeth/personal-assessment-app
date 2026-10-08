import type { Door } from "@/lib/doors";
import type { IdentityArgs } from "@/lib/identity";
import type { StandaloneCategory, SubmissionKind } from "@/lib/supabase/types";

// Lets someone who is mid-assessment get back to where they were if the page
// reloads (pull-to-refresh, a phone dropping the tab from memory, etc.).
//
// Held in sessionStorage: it belongs to this one browser tab and the browser
// clears it when the tab closes. The PIN is NEVER stored; after a reload on
// the Intentional Ministries door the person types the PIN again, and it is
// checked by the database before they continue. Answers themselves are not
// stored here either; they are already saved on the server as they go.
const KEY = "da_resume_v1";

export interface ResumeState {
  door: Door;
  // Identity without the PIN.
  args: Omit<IdentityArgs, "pin">;
  category: StandaloneCategory;
  submissionId: string;
  isMarried: boolean | null;
  hasChildren: boolean | null;
  kind: SubmissionKind;
}

export function saveResume(state: ResumeState) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage blocked (private mode etc.): resume just isn't available.
  }
}

export function loadResume(): ResumeState | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ResumeState) : null;
  } catch {
    return null;
  }
}

export function clearResume() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

// True when this page load is a reload or a back/forward restore, as opposed
// to the person deliberately opening the page fresh.
export function isReloadNavigation(): boolean {
  try {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    return nav?.type === "reload" || nav?.type === "back_forward";
  } catch {
    return false;
  }
}
