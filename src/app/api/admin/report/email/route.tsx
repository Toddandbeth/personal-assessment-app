import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/session";
import ReportDocument from "@/lib/pdf/ReportDocument";
import { renderPdf } from "@/lib/pdf/render";
import { isValidEmail, sendPdfEmail, wrapEmailHtml } from "@/lib/email/resend";
import type { ReportUnit } from "@/lib/admin/report";

export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const units = body?.units as ReportUnit[] | undefined;
  const email = typeof body?.email === "string" ? body.email.trim() : "";

  if (!Array.isArray(units) || units.length === 0) {
    return NextResponse.json({ error: "No report to email." }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const document = <ReportDocument units={units} />;
  try {
    const buffer = await renderPdf(document);
    await sendPdfEmail({
      to: email,
      subject: `Personal Assessment Report — ${units[0].title}`,
      html: wrapEmailHtml({
        heading: "Personal Assessment Report",
        bodyHtml: `<p>Attached is the report you generated: <strong>${units.map((u) => u.title).join(", ")}</strong>.</p>`,
      }),
      pdfBuffer: buffer,
      filename: "personal-assessment-report.pdf",
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong sending that email. Please try again." },
      { status: 500 }
    );
  }
}
