"use client";

import { useState } from "react";

type Payload = Record<string, unknown>;

export default function DeliveryControls({
  pdfEndpoint,
  emailEndpoint,
  payload,
  downloadFilename,
  emailButtonLabel = "Email me my results",
}: {
  pdfEndpoint: string;
  emailEndpoint: string;
  // A plain object for a payload that's already loaded, or a function to
  // fetch it fresh right before sending — used by Region reports, whose
  // on-screen view only loads the (cheap) combined unit, but whose PDF
  // needs the full per-group-plus-combined bundle.
  payload: Payload | (() => Promise<Payload>);
  downloadFilename: string;
  emailButtonLabel?: string;
}) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [showEmailField, setShowEmailField] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle" | "sent" | "error">("idle");
  const [emailError, setEmailError] = useState<string | null>(null);

  async function handleDownload() {
    setDownloading(true);
    setDownloadError(null);
    try {
      const resolvedPayload = typeof payload === "function" ? await payload() : payload;
      const res = await fetch(pdfEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resolvedPayload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDownloadError(data.error ?? "Failed to generate PDF.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadFilename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError("Something went wrong. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  async function handleSendEmail() {
    if (emailSending) return;
    setEmailSending(true);
    setEmailStatus("idle");
    setEmailError(null);
    try {
      const resolvedPayload = typeof payload === "function" ? await payload() : payload;
      const res = await fetch(emailEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...resolvedPayload, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailStatus("error");
        setEmailError(data.error ?? "Failed to send email.");
        return;
      }
      setEmailStatus("sent");
    } catch {
      setEmailStatus("error");
      setEmailError("Something went wrong. Please try again.");
    } finally {
      setEmailSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="rounded-full border border-[#ccd0d6] px-4 py-2 text-sm font-medium text-[#253551] hover:bg-[#ccd0d6]/40 disabled:opacity-50"
        >
          {downloading ? "Preparing..." : "Download PDF"}
        </button>
        <button
          type="button"
          onClick={() => setShowEmailField((v) => !v)}
          className="rounded-full border border-[#ccd0d6] px-4 py-2 text-sm font-medium text-[#253551] hover:bg-[#ccd0d6]/40"
        >
          {emailButtonLabel}
        </button>
      </div>
      {downloadError && <p className="text-xs text-red-600">{downloadError}</p>}

      {showEmailField && (
        <div className="flex flex-col gap-2 rounded-lg border border-[#ccd0d6] p-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="rounded-lg border border-[#ccd0d6] bg-white px-3 py-2 text-sm text-zinc-900 focus:border-[#7993c2] focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSendEmail}
            disabled={emailSending || !email.trim()}
            className="rounded-full bg-[#253551] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a2740] disabled:opacity-50"
          >
            {emailSending ? "Sending..." : "Send"}
          </button>
          {emailStatus === "sent" && (
            <p className="text-xs text-emerald-600">Sent! Check your inbox.</p>
          )}
          {emailStatus === "error" && emailError && (
            <p className="text-xs text-red-600">{emailError}</p>
          )}
        </div>
      )}
    </div>
  );
}
