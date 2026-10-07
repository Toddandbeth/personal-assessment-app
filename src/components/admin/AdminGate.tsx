"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function AdminGate({
  loginEndpoint = "/api/admin/login",
}: {
  loginEndpoint?: string;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!code.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(loginEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        setError(
          res.status === 429
            ? "Too many attempts. Please wait a while and try again."
            : "Incorrect code. Please try again."
        );
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-center">
      <h1 className="text-xl font-semibold text-[#253551]">Admin Access</h1>
      <p className="text-sm text-zinc-600">Enter the admin access code to continue.</p>
      <input
        type="password"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        autoComplete="off"
        className="rounded-lg border border-[#ccd0d6] bg-white px-3 py-2 text-center text-lg tracking-widest text-zinc-900 focus:border-[#7993c2] focus:outline-none"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-[#253551] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1a2740] disabled:opacity-50"
      >
        {submitting ? "Checking..." : "Continue"}
      </button>
    </form>
  );
}
