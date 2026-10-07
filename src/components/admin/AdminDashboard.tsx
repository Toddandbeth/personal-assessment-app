"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CreateCategoryForm from "@/components/admin/CreateCategoryForm";
import CreateRegionForm from "@/components/admin/CreateRegionForm";
import CategoryReportBlock, { type CategoryOverview } from "@/components/admin/CategoryReportBlock";

export default function AdminDashboard() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryOverview[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCreateCategory, setShowCreateCategory] = useState(false);

  const loadOverview = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/overview");
      if (!res.ok) {
        setLoadError("Couldn't load the admin overview.");
        return;
      }
      const data = await res.json();
      setCategories(data.categories);
    } catch {
      setLoadError("Couldn't load the admin overview.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/overview")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled) setCategories(data.categories);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Couldn't load the admin overview.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/fullcount");
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#253551]">Admin</h1>
        <button
          onClick={handleLogout}
          className="text-sm font-medium text-[#7993c2] hover:text-[#253551]"
        >
          Log out
        </button>
      </div>

      <section className="flex flex-col gap-4">
        {loadError && <p className="text-sm text-red-600">{loadError}</p>}
        {!categories && !loadError && (
          <p className="text-sm text-zinc-500">Loading...</p>
        )}
        {categories && categories.length === 0 && (
          <p className="text-sm text-zinc-500">No categories yet.</p>
        )}
        {categories?.map((category) => (
          <CategoryReportBlock key={category.id} category={category} onChanged={loadOverview} />
        ))}
      </section>

      <section className="rounded-lg border border-[#ccd0d6] bg-[#ccd0d6]/20 p-4">
        <CreateRegionForm
          categories={categories ?? []}
          onCreated={loadOverview}
        />
      </section>

      <section className="rounded-lg border border-[#ccd0d6] p-4">
        <button
          type="button"
          onClick={() => setShowCreateCategory((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-[#7993c2] hover:text-[#253551]"
        >
          <span>{showCreateCategory ? "▾" : "▸"}</span>
          Create Category
        </button>
        {showCreateCategory && (
          <div className="mt-3">
            <CreateCategoryForm onCreated={loadOverview} />
          </div>
        )}
      </section>
    </div>
  );
}
