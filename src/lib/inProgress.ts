// Tracks whether the person is in the middle of answering questions, so that
// leaving links can ask first and the page never reloads under them.
// A tiny external store (no provider needed) read with useSyncExternalStore.
let inProgress = false;
const listeners = new Set<() => void>();

export function setAssessmentInProgress(value: boolean) {
  if (inProgress === value) return;
  inProgress = value;
  listeners.forEach((l) => l());
}

export function isAssessmentInProgress() {
  return inProgress;
}

export function subscribeInProgress(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
