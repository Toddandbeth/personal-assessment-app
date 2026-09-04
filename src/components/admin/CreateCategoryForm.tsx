"use client";

import { useState, type FormEvent } from "react";

export default function CreateCategoryForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create category.");
        return;
      }
      setName("");
      onCreated();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-[#253551]">Create Category</h2>
      <p className="text-xs text-zinc-500">
        New categories won&apos;t have an assessment until questions are added for
        them — Men and High School already have theirs.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Women"
          className="flex-1 rounded-lg border border-[#ccd0d6] bg-white px-3 py-2 text-sm text-zinc-900 focus:border-[#7993c2] focus:outline-none"
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-[#253551] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a2740] disabled:opacity-50"
        >
          {submitting ? "Adding..." : "Add"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
