import { NextResponse } from "next/server";
import ComparisonDocument from "@/lib/pdf/ComparisonDocument";
import { renderPdf } from "@/lib/pdf/render";
import { isValidEmail, sendPdfEmail, wrapEmailHtml } from "@/lib/email/resend";
import { parseDoor } from "@/lib/doors";
import type { ComparisonRow } from "@/lib/supabase/types";

// Participant-facing, unauthenticated — same trust model as /api/report/pdf.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const rows = body?.rows as ComparisonRow[] | undefined;
  const firstName = typeof body?.firstName === "string" ? body.firstName : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const baselineOnly = body?.baselineOnly === true;
  const door = parseDoor(body?.door);
  const goalBaseline = typeof body?.goalBaseline === "string" ? body.goalBaseline : null;
  const goalRetake = typeof body?.goalRetake === "string" ? body.goalRetake : null;

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No results to email." }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const document = <ComparisonDocument rows={rows} firstName={firstName} baselineOnly={baselineOnly} goalBaseline={goalBaseline} goalRetake={goalRetake} />;
  try {
    const buffer = await renderPdf(document);
    await sendPdfEmail({
      to: email,
      subject: firstName ? `${firstName}'s Personal Assessment Results` : "Your Personal Assessment Results",
      html: wrapEmailHtml({
        heading: door === "intentionalministries" ? "Intentional Ministries" : "Your Personal Assessment Results",
        bodyHtml: `<p>${firstName ? `Hi ${firstName},` : "Hi,"}</p><p>Attached is your ${baselineOnly ? "" : "before-and-after "}personal assessment report.</p>`,
      }),
      pdfBuffer: buffer,
      filename: "personal-assessment-results.pdf",
      door,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong sending that email. Please try again." },
      { status: 500 }
    );
  }
}
