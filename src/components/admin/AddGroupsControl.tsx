"use client";

import { useState } from "react";

export default function AddGroupsControl({
  regionId,
  onAdded,
}: {
  regionId: string;
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/regions/${regionId}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: Number(count) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to add groups.");
        return;
      }
      setOpen(false);
      setCount("1");
      onAdded();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="text-xs font-medium text-[#7993c2] underline hover:text-[#253551]"
      >
        Add Groups
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <input
        type="number"
        min={1}
        max={200}
        value={count}
        onChange={(e) => setCount(e.target.value)}
        className="w-16 rounded-lg border border-[#ccd0d6] bg-white px-2 py-1 text-xs text-zinc-900 focus:border-[#7993c2] focus:outline-none"
      />
      <button
        type="button"
        onClick={handleAdd}
        disabled={submitting}
        className="rounded-full bg-[#253551] px-3 py-1 text-xs font-medium text-white hover:bg-[#1a2740] disabled:opacity-50"
      >
        {submitting ? "Adding..." : "Add"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-zinc-400 hover:text-zinc-600"
      >
        Cancel
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
