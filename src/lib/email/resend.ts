import "server-only";

const RESEND_API_URL = "https://api.resend.com/emails";
// Reuses the ministry's already-verified subdomain — see the sibling
// Accountability app's src/lib/welcomeEmail.ts, which notes the bare root
// domain bounces and only mail.intentionalministries.com is verified.
const FROM_ADDRESS = "Personal Assessment <results@mail.intentionalministries.com>";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

const BRAND_NAVY = "#253551";

// Shared branded wrapper for every outgoing email (participant results and
// admin reports alike) — a light-navy header band plus a plain white body,
// so both look like the same product instead of unstyled text. `bodyHtml`
// is the only per-email content; callers decide how specific (admin) or
// generic (participant) that content is.
export function wrapEmailHtml({ heading, bodyHtml }: { heading: string; bodyHtml: string }): string {
  return `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <div style="background-color: ${BRAND_NAVY}; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 700;">
          ${heading}
        </h1>
      </div>
      <div style="background-color: #ffffff; padding: 24px; border: 1px solid #ccd0d6; border-top: none; border-radius: 0 0 8px 8px; color: #27272a; font-size: 14px; line-height: 1.6;">
        ${bodyHtml}
      </div>
    </div>
  `;
}

export interface SendPdfEmailParams {
  to: string;
  subject: string;
  html: string;
  pdfBuffer: Buffer;
  filename: string;
}

// Unlike the sibling app's fire-and-forget welcome email, this is a
// user-initiated "email me" action — callers should catch and surface the
// error rather than swallow it.
export async function sendPdfEmail(params: SendPdfEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Email isn't configured yet (missing RESEND_API_KEY).");
  }

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      attachments: [
        {
          filename: params.filename,
          content: params.pdfBuffer.toString("base64"),
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to send email (${response.status}): ${body}`);
  }
}
