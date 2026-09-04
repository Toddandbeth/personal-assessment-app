"use client";

import { useState, type FormEvent } from "react";

export interface CategoryOption {
  id: string;
  name: string;
}

export default function CreateRegionForm({
  categories,
  onCreated,
}: {
  categories: CategoryOption[];
  onCreated: () => void;
}) {
  // "" means "no explicit selection yet" — the overview (and its
  // categories) loads asynchronously after this form first mounts, so we
  // can't capture a real default in useState's initializer. Derive the
  // effective selection at render time instead of syncing state to a
  // changing prop via an effect (this is what React's own effect
  // guidance recommends for exactly this situation).
  const [categoryId, setCategoryId] = useState("");
  const selectedCategoryId = categoryId || categories[0]?.id || "";
  const [name, setName] = useState("");
  const [count, setCount] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedCategoryId || !name.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/regions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: selectedCategoryId, name, count: Number(count) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create region.");
        return;
      }
      setName("");
      setCount("1");
      onCreated();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-[#253551]">Create Region</h2>
      <select
        value={selectedCategoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        className="rounded-lg border border-[#ccd0d6] bg-white px-3 py-2 text-sm text-zinc-900 focus:border-[#7993c2] focus:outline-none"
      >
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. TN2026"
        className="rounded-lg border border-[#ccd0d6] bg-white px-3 py-2 text-sm text-zinc-900 focus:border-[#7993c2] focus:outline-none"
      />
      <label className="flex items-center gap-2 text-sm text-zinc-700">
        Number of groups
        <input
          type="number"
          min={1}
          max={200}
          value={count}
          onChange={(e) => setCount(e.target.value)}
          className="w-20 rounded-lg border border-[#ccd0d6] bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-[#7993c2] focus:outline-none"
        />
      </label>
      <button
        type="submit"
        disabled={submitting || categories.length === 0}
        className="rounded-full bg-[#253551] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a2740] disabled:opacity-50"
      >
        {submitting ? "Creating..." : "Create Region"}
      </button>
      {categories.length === 0 && (
        <p className="text-xs text-zinc-500">Create a category first.</p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
