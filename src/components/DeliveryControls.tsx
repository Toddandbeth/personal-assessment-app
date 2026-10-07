"use client";

import { useEffect, useRef, useState } from "react";

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
  const [pdfLink, setPdfLink] = useState<string | null>(null);
  const [showEmailField, setShowEmailField] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle" | "sent" | "error">("idle");
  const [emailError, setEmailError] = useState<string | null>(null);

  // On iPhone/Android a PDF must never be opened by navigating this page to
  // it — the browser's viewer then takes over the whole screen with no way
  // back (worse still in a home-screen web app, which has no browser chrome).
  // Instead hand the file to the phone's native share sheet (Share / Print /
  // Save to Files). navigator.share needs a fresh tap, and waiting on a
  // network request first can use that up, so the PDF is generated ahead of
  // time and the tap calls share() immediately.
  const isTouchDevice = () =>
    typeof navigator !== "undefined" &&
    (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
  const canShareFile = (file: File) =>
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] });

  const payloadKey = typeof payload === "function" ? null : JSON.stringify(payload);
  const prefetched = useRef<{ key: string; file: File } | null>(null);

  useEffect(() => {
    if (payloadKey === null || !isTouchDevice()) return;
    let cancelled = false;
    fetch(pdfEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payloadKey,
    })
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => {
        if (!blob || cancelled) return;
        prefetched.current = {
          key: payloadKey,
          file: new File([blob], downloadFilename, { type: "application/pdf" }),
        };
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [payloadKey, pdfEndpoint, downloadFilename]);

  async function shareOrLink(file: File) {
    if (canShareFile(file)) {
      try {
        await navigator.share({ files: [file], title: downloadFilename });
        return;
      } catch (err) {
        // Closing the share sheet is a normal outcome, not an error.
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    // Share unavailable or refused: offer a tap-to-open link (opens in its own
    // tab) — never navigate this page to the PDF.
    setPdfLink(URL.createObjectURL(file));
  }

  async function handleDownload() {
    setDownloadError(null);
    const touch = isTouchDevice();

    if (touch && payloadKey !== null) {
      const ready = prefetched.current;
      if (ready && ready.key === payloadKey && canShareFile(ready.file)) {
        await shareOrLink(ready.file);
        return;
      }
    }

    setDownloading(true);
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
      if (touch) {
        await shareOrLink(new File([blob], downloadFilename, { type: "application/pdf" }));
        return;
      }
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
      {pdfLink && (
        <a
          href={pdfLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-[#7993c2] underline"
        >
          Your PDF is ready — tap here to open it
        </a>
      )}

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
