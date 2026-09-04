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
