import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/session";
import ReportDocument from "@/lib/pdf/ReportDocument";
import { renderPdf } from "@/lib/pdf/render";
import type { ReportUnit } from "@/lib/admin/report";

export async function POST(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const units = body?.units as ReportUnit[] | undefined;

  if (!Array.isArray(units) || units.length === 0) {
    return NextResponse.json({ error: "No report to export." }, { status: 400 });
  }

  const document = <ReportDocument units={units} />;
  try {
    const buffer = await renderPdf(document);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="personal-assessment-report.pdf"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to generate PDF." }, { status: 500 });
  }
}
